"""BarberFlow: zero-paid-API local MVP; multi-tenant editing with authenticated media access."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
import hashlib
import hmac
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import time
from typing import Annotated
from threading import Lock
from collections import defaultdict, deque
from urllib.parse import urlsplit
import uuid

from fastapi import FastAPI, Request, HTTPException, Depends, UploadFile, File, Form, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from pydantic import BaseModel, Field
from .engine import probe, render

ROOT=Path(__file__).resolve().parent.parent
DATA=Path(os.getenv('BF_DATA_DIR',str(ROOT/'media'))).resolve()
DATA.mkdir(parents=True,exist_ok=True)
DB=DATA/'barberflow.sqlite3'
ENV=os.getenv('APP_ENV','development')
SECRET=os.getenv('SECRET_KEY')
if ENV=='production' and (not SECRET or len(SECRET)<32 or SECRET=='replace-with-unique-random-string-in-production'):
    raise RuntimeError('SECRET_KEY must be unique and at least 32 characters in production')
SECRET=SECRET or secrets.token_urlsafe(48)
S=URLSafeTimedSerializer(SECRET,salt='barberflow-session-v1')
POOL=ThreadPoolExecutor(max_workers=max(1,int(os.getenv('BF_WORKERS','2'))))
MAX_MB=int(os.getenv('BF_MAX_UPLOAD_MB','250'))
MAX_INPUT_MIN=int(os.getenv('BF_MAX_INPUT_MINUTES','45'))
MAX_SALON_STORAGE_MB=int(os.getenv('BF_MAX_SALON_STORAGE_MB','5000'))
MAX_ACTIVE_PER_SALON=int(os.getenv('BF_MAX_ACTIVE_PER_SALON','3'))
RATE_LOCK=Lock()
RATE_WINDOWS=defaultdict(deque)
VIDEO_EXT={'.mp4','.mov','.m4v','.webm','.mkv'}
MUSIC_EXT={'.mp3','.m4a','.aac','.wav','.ogg'}
STYLES={'cinematic','clean','bold'}
WIDTH=int(os.getenv('BF_OUTPUT_WIDTH','1080'))
HEIGHT=int(os.getenv('BF_OUTPUT_HEIGHT','1920'))
app=FastAPI(title='BarberFlow API',version='0.2.0',docs_url='/api/docs' if ENV !='production' else None,redoc_url=None)

@contextmanager
def connect():
    con=sqlite3.connect(DB,timeout=30)
    con.row_factory=sqlite3.Row
    con.execute('PRAGMA foreign_keys = ON')
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback();raise
    finally:
        con.close()

with connect() as con:
    con.execute('PRAGMA journal_mode=WAL')
    con.executescript('''
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS salons(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, salon_id TEXT NOT NULL REFERENCES salons(id), title TEXT NOT NULL, style TEXT NOT NULL, mode TEXT NOT NULL, state TEXT NOT NULL, error TEXT, output_duration REAL, render_seconds REAL, consent INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_projects_salon ON projects(salon_id,created_at DESC);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, filename TEXT NOT NULL, stored_name TEXT NOT NULL, duration REAL NOT NULL, size_bytes INTEGER NOT NULL, ordinal INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT,salon_id TEXT NOT NULL, project_id TEXT, action TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS scheduled_posts(id TEXT PRIMARY KEY, salon_id TEXT NOT NULL REFERENCES salons(id), project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,platform TEXT NOT NULL,caption TEXT NOT NULL,scheduled_at TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'planned',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_scheduled_salon ON scheduled_posts(salon_id,scheduled_at);
''')
    if 'target_seconds' not in {c['name'] for c in con.execute('PRAGMA table_info(projects)')}:
        con.execute('ALTER TABLE projects ADD COLUMN target_seconds INTEGER NOT NULL DEFAULT 24')
    # Incomplete operations can be retried manually after an unexpected restart.
    con.execute("UPDATE projects SET state='failed', error='Server restarted during processing. Retry this edit.' WHERE state IN ('queued','processing')")

def now(): return datetime.now(timezone.utc).isoformat()
def throttle(request, purpose, limit, period=900):
    # Best-effort in-process throttle for a single-host installation; a distributed
    # deployment must replace this with Redis or an edge gateway.
    address=request.client.host if request.client else 'unknown'
    key=(purpose,address)
    current=time.monotonic()
    with RATE_LOCK:
        window=RATE_WINDOWS[key]
        while window and current-window[0]>period:window.popleft()
        if len(window)>=limit:raise HTTPException(429,'Too many requests. Please try again later.')
        window.append(current)
        if len(RATE_WINDOWS)>3000:
            for k in list(RATE_WINDOWS)[:500]:
                if k!=key:RATE_WINDOWS.pop(k,None)

def uid(): return str(uuid.uuid4())
def json_error(message,status=400): return JSONResponse({'detail':message},status_code=status)

@app.middleware('http')
async def secure_requests(request:Request,call_next):
    if request.method in ('POST','PUT','PATCH','DELETE'):
        origin=request.headers.get('origin')
        if origin:
            try:
                own=request.url.netloc.lower()
                incoming=urlsplit(origin)
                if incoming.netloc.lower()!=own or incoming.scheme not in ('http','https'):
                    return json_error('Origin mismatch',403)
            except ValueError:
                return json_error('Invalid origin',403)
    resp=await call_next(request)
    resp.headers['X-Content-Type-Options']='nosniff'
    resp.headers['Referrer-Policy']='strict-origin-when-cross-origin'
    resp.headers['X-Frame-Options']='DENY'
    resp.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    return resp

class Credentials(BaseModel):
    email:str
    password:str
class Registration(Credentials):
    name:str
    salon_name:str
class SalonUpdate(BaseModel):
    name:str=Field(min_length=2,max_length=65)

def salted(password,salt): return hashlib.scrypt(password.encode(),salt=bytes.fromhex(salt),n=2**14,r=8,p=1).hex()
def get_user(request:Request):
    token=request.cookies.get('bf_session')
    if not token: raise HTTPException(401,'Sign in to continue')
    try: data=S.loads(token,max_age=60*60*24*14)
    except (BadSignature,SignatureExpired): raise HTTPException(401,'Session expired')
    with connect() as con:
        user=con.execute('SELECT id,email,display_name FROM users WHERE id=?',(data.get('uid'),)).fetchone()
        if not user: raise HTTPException(401,'Account not found')
        salon=con.execute('SELECT id,name FROM salons WHERE owner_id=?',(user['id'],)).fetchone()
    if not salon: raise HTTPException(403,'Salon not found')
    return {'id':user['id'],'email':user['email'],'name':user['display_name'],'salon_id':salon['id'],'salon':salon['name']}

def login_cookie(response,uid):
    response.set_cookie('bf_session',S.dumps({'uid':uid}),httponly=True,secure=ENV=='production',samesite='lax',max_age=60*60*24*14,path='/')

@app.post('/api/auth/register')
def register(body:Registration,response:Response,request:Request):
    if ENV == 'production' and os.getenv('BF_ALLOW_OPEN_SIGNUP','false').strip().lower() not in ('true','1','yes'):
        raise HTTPException(403,'New account registration is closed during the private beta')
    throttle(request,'register',8,3600)
    email=body.email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(email)>200: raise HTTPException(400,'Enter a valid email')
    if not 10<=len(body.password)<=128: raise HTTPException(400,'Password must be 10–128 characters')
    name=body.name.strip();salon_name=body.salon_name.strip()
    if not 2<=len(name)<=65 or not 2<=len(salon_name)<=65:raise HTTPException(400,'Name and salon should contain 2–65 characters')
    u=uid();s=uid();salt=secrets.token_hex(16)
    try:
        with connect() as con:
            con.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(u,email,name,salt,salted(body.password,salt),now()))
            con.execute('INSERT INTO salons VALUES(?,?,?,?)',(s,u,salon_name,now()))
    except sqlite3.IntegrityError: raise HTTPException(409,'Email already registered')
    login_cookie(response,u)
    return {'user':{'id':u,'name':name,'email':email,'salon':salon_name,'salon_id':s}}

@app.post('/api/auth/login')
def login(body:Credentials,response:Response,request:Request):
    throttle(request,'login',30,900)
    with connect() as con:
        user=con.execute('SELECT * FROM users WHERE email=?',(body.email.strip().lower(),)).fetchone()
        salon=con.execute('SELECT id,name FROM salons WHERE owner_id=?',(user['id'],)).fetchone() if user else None
    dummy='0'*32
    comparison=salted(body.password,user['salt'] if user else dummy)
    if not user or not hmac.compare_digest(comparison,user['password_hash']):raise HTTPException(401,'Invalid email or password')
    login_cookie(response,user['id'])
    return {'user':{'id':user['id'],'name':user['display_name'],'email':user['email'],'salon_id':salon['id'],'salon':salon['name']}}

@app.post('/api/auth/logout')
def logout(response:Response):
    response.delete_cookie('bf_session',path='/')
    return {'ok':True}

@app.get('/api/auth/me')
def me(user=Depends(get_user)):return {'user':user}

@app.patch('/api/salon')
def salon_update(body:SalonUpdate,user=Depends(get_user)):
    with connect() as con:con.execute('UPDATE salons SET name=? WHERE id=?',(body.name.strip(),user['salon_id']))
    return {'name':body.name.strip()}

def own_project(pid,user):
    with connect() as con: p=con.execute('SELECT * FROM projects WHERE id=? AND salon_id=?',(pid,user['salon_id'])).fetchone()
    if not p:raise HTTPException(404,'Project not found')
    return dict(p)

def project_payload(p):
    with connect() as con: assets=con.execute('SELECT id,filename,duration,size_bytes,ordinal FROM assets WHERE project_id=? ORDER BY ordinal',(p['id'],)).fetchall()
    return {**p,'assets':[dict(a) for a in assets], 'video_url':f'/api/projects/{p["id"]}/video' if p['state']=='ready' else None,'thumb_url':f'/api/projects/{p["id"]}/thumbnail' if p['state']=='ready' else None}

def activity(salon_id,pid,action):
    with connect() as con: con.execute('INSERT INTO activity(salon_id,project_id,action,created_at) VALUES(?,?,?,?)',(salon_id,pid,action,now()))

def render_job(pid):
    with connect() as con:
        row=con.execute("UPDATE projects SET state='processing',error=NULL,updated_at=? WHERE id=? AND state='queued' RETURNING salon_id,style,target_seconds",(now(),pid)).fetchone()
        if not row:return
        assets=con.execute('SELECT stored_name FROM assets WHERE project_id=? ORDER BY ordinal',(pid,)).fetchall()
        salon=con.execute('SELECT name FROM salons WHERE id=?',(row['salon_id'],)).fetchone()
    folder=DATA/'salons'/row['salon_id']/pid
    try:
        files=[folder/a['stored_name'] for a in assets]
        music=folder/'music' if (folder/'music').exists() else None
        result=render(files,folder/'final.mp4',folder/'poster.jpg',salon['name'],row['style'],music,WIDTH,HEIGHT,maximum_seconds=row['target_seconds'])
        with connect() as con:
            con.execute('UPDATE projects SET state=?,error=NULL,output_duration=?,render_seconds=?,updated_at=? WHERE id=?',('ready',result['duration'],result['render_seconds'],now(),pid))
        activity(row['salon_id'],pid,'Video rendered successfully')
    except Exception as e:
        # Do not return raw ffmpeg file paths or system details to browser clients.
        with connect() as con:con.execute('UPDATE projects SET state=?,error=?,updated_at=? WHERE id=?',('failed','The video could not be rendered. Check file codecs and try again.',now(),pid))
        print(f'[render:{pid}] {type(e).__name__}: {str(e)[-500:]}',flush=True)
        activity(row['salon_id'],pid,'Rendering failed')

async def save_upload(upload,target,max_size,allowed):
    original=Path(upload.filename or 'upload').name
    ext=Path(original).suffix.lower()
    if ext not in allowed:raise HTTPException(400,f'Unsupported file format: {ext or "unknown"}')
    size=0
    with target.open('wb') as f:
        while chunk:=await upload.read(1024*1024):
            size+=len(chunk)
            if size>max_size:raise HTTPException(413,f'File exceeds {MAX_MB} MB limit')
            f.write(chunk)
    await upload.close()
    if size<1024:raise HTTPException(400,'File is empty')
    return original,size

@app.post('/api/projects',status_code=201)
async def create_project(title:Annotated[str,Form()],style:Annotated[str,Form()],mode:Annotated[str,Form()],consent:Annotated[bool,Form()],files:Annotated[list[UploadFile],File()], user=Depends(get_user),music:UploadFile|None=File(default=None),target_seconds:Annotated[int,Form()]=24):
    title=title.strip()
    if not 2<=len(title)<=90:raise HTTPException(400,'Title must be 2–90 characters')
    if style not in STYLES or mode not in ('long','clips'):raise HTTPException(400,'Unsupported editing mode or style')
    if not consent:raise HTTPException(400,'Permission to use the footage is required')
    if target_seconds not in (15,24,30,45):raise HTTPException(400,'Invalid export duration')
    with connect() as con:
        current=con.execute('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN state IN ("queued","processing") THEN 1 ELSE 0 END),0) AS active FROM projects WHERE salon_id=?',(user['salon_id'],)).fetchone()
        used=con.execute('SELECT COALESCE(SUM(a.size_bytes),0) AS bytes FROM assets a JOIN projects p ON p.id=a.project_id WHERE p.salon_id=?',(user['salon_id'],)).fetchone()['bytes']
    if current['total']>=200:raise HTTPException(429,'Studio project limit reached; delete old projects')
    if current['active']>=MAX_ACTIVE_PER_SALON:raise HTTPException(429,'Too many active renders; wait for completion')
    if used>=MAX_SALON_STORAGE_MB*1024*1024:raise HTTPException(413,'Studio storage limit reached')
    if not 1<=len(files)<=12:raise HTTPException(400,'Upload between 1 and 12 videos')
    if mode=='long' and len(files)!=1:raise HTTPException(400,'Long recording mode accepts exactly one video')
    pid=uid(); folder=DATA/'salons'/user['salon_id']/pid;folder.mkdir(parents=True,exist_ok=False)
    assets=[]
    try:
        duration_total=0
        for idx,uploaded in enumerate(files):
            ext=Path(uploaded.filename or '').suffix.lower()
            stored=f'{idx:02}-{uid()}{ext}'
            original,size=await save_upload(uploaded,folder/stored,MAX_MB*1024*1024,VIDEO_EXT)
            meta=probe(folder/stored)
            duration_total+=meta['duration']
            if duration_total>MAX_INPUT_MIN*60:raise HTTPException(400,f'Input footage exceeds {MAX_INPUT_MIN} minutes')
            assets.append((uid(),pid,original,stored,meta['duration'],size,idx))
        if used+sum(a[5] for a in assets)>MAX_SALON_STORAGE_MB*1024*1024:raise HTTPException(413,'Studio storage limit reached')
        if music and music.filename:
            await save_upload(music,folder/'music',30*1024*1024,MUSIC_EXT)
        with connect() as con:
            t=now()
            con.execute('INSERT INTO projects(id,salon_id,title,style,mode,state,consent,created_at,updated_at,target_seconds) VALUES(?,?,?,?,?,?,?,?,?,?)',(pid,user['salon_id'],title,style,mode,'queued',int(consent),t,t,target_seconds))
            con.executemany('INSERT INTO assets VALUES(?,?,?,?,?,?,?)',assets)
        activity(user['salon_id'],pid,'Project uploaded')
        POOL.submit(render_job,pid)
        return project_payload(own_project(pid,user))
    except (HTTPException,ValueError) as e:
        shutil.rmtree(folder,ignore_errors=True)
        if isinstance(e,HTTPException):raise
        raise HTTPException(400,str(e))
    except Exception:
        shutil.rmtree(folder,ignore_errors=True)
        raise

@app.get('/api/projects')
def list_projects(user=Depends(get_user)):
    with connect() as con: ps=con.execute('SELECT * FROM projects WHERE salon_id=? ORDER BY created_at DESC LIMIT 100',(user['salon_id'],)).fetchall()
    return {'projects':[project_payload(dict(p)) for p in ps]}

@app.get('/api/projects/{pid}')
def get_project(pid:str,user=Depends(get_user)):return project_payload(own_project(pid,user))

@app.post('/api/projects/{pid}/retry')
def retry(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state']!='failed':raise HTTPException(409,'Only failed projects can be retried')
    with connect() as con:con.execute("UPDATE projects SET state='queued', error=NULL, updated_at=? WHERE id=? AND state='failed'",(now(),pid))
    POOL.submit(render_job,pid)
    return {'ok':True}

@app.delete('/api/projects/{pid}')
def delete_project(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state'] in ('queued','processing'):raise HTTPException(409,'Cannot delete while processing')
    with connect() as con:
        con.execute('DELETE FROM assets WHERE project_id=?',(pid,))
        con.execute('DELETE FROM projects WHERE id=? AND salon_id=?',(pid,user['salon_id']))
    shutil.rmtree(DATA/'salons'/user['salon_id']/pid,ignore_errors=True)
    return {'ok':True}

@app.get('/api/projects/{pid}/video')
def video(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state']!='ready':raise HTTPException(404,'Video not ready')
    target=DATA/'salons'/user['salon_id']/pid/'final.mp4'
    if not target.is_file():raise HTTPException(404,'Video file not found')
    return FileResponse(target,media_type='video/mp4',filename='barberflow-'+pid[:8]+'.mp4',content_disposition_type='inline')

@app.get('/api/projects/{pid}/download')
def download(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state']!='ready':raise HTTPException(404,'Video not ready')
    target=DATA/'salons'/user['salon_id']/pid/'final.mp4'
    return FileResponse(target,media_type='video/mp4',filename='barberflow-'+pid[:8]+'.mp4',content_disposition_type='attachment')

@app.get('/api/projects/{pid}/thumbnail')
def thumbnail(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state']!='ready':raise HTTPException(404,'Thumbnail not ready')
    return FileResponse(DATA/'salons'/user['salon_id']/pid/'poster.jpg',media_type='image/jpeg')

@app.get('/api/projects/{pid}/caption')
def caption(pid:str,user=Depends(get_user)):
    p=own_project(pid,user)
    if p['state']!='ready':raise HTTPException(409,'Render the video first')
    salon=user['salon']
    title=p['title']
    return {'caption':f'Fresh details. A sharp new look. ✂️\n\n{title} at {salon}.\nReady for your next transformation? Book your appointment.\n\n#Barber #FreshFade #Barbershop #HairTransformation #MensHaircut', 'note':'Template caption; edit it before posting. No social platforms are connected.'}

@app.get('/api/stats')
def stats(user=Depends(get_user)):
    with connect() as con:
        rows=con.execute('SELECT state,COUNT(*) as n,COALESCE(SUM(output_duration),0) as duration FROM projects WHERE salon_id=? GROUP BY state',(user['salon_id'],)).fetchall()
        recent=con.execute('SELECT action,created_at,project_id FROM activity WHERE salon_id=? ORDER BY id DESC LIMIT 8',(user['salon_id'],)).fetchall()
    counts={r['state']:r['n'] for r in rows}
    return {'projects':sum(counts.values()),'completed':counts.get('ready',0),'processing':counts.get('queued',0)+counts.get('processing',0),'failed':counts.get('failed',0),'minutes':round(sum(r['duration'] for r in rows)/60,1),'activity':[dict(a) for a in recent]}

@app.get('/api/health')
def health():return {'ok':True,'version':'0.2.0','editor':'FFmpeg (offline)','publishing':'manual planning only'}


class AccountRemoval(BaseModel):
    password:str

@app.get('/api/account/export')
def account_export(user=Depends(get_user)):
    with connect() as con:
        projects=[dict(r) for r in con.execute('SELECT * FROM projects WHERE salon_id=? ORDER BY created_at',(user['salon_id'],)).fetchall()]
        plans=[dict(r) for r in con.execute('SELECT * FROM scheduled_posts WHERE salon_id=? ORDER BY scheduled_at',(user['salon_id'],)).fetchall()]
        actions=[dict(r) for r in con.execute('SELECT * FROM activity WHERE salon_id=? ORDER BY created_at',(user['salon_id'],)).fetchall()]
        booking_requests=[dict(r) for r in con.execute('SELECT * FROM bf_bookings WHERE salon_id=? ORDER BY starts_at',(user['salon_id'],)).fetchall()]
        booking_services=[dict(r) for r in con.execute('SELECT * FROM bf_services WHERE salon_id=? ORDER BY created_at',(user['salon_id'],)).fetchall()]
        email_events=[dict(r) for r in con.execute('SELECT * FROM bf_mail_outbox WHERE salon_id=? ORDER BY created_at',(user['salon_id'],)).fetchall()]
    return {'user':user,'projects':projects,'calendar':plans,'activity':actions,'booking_requests':booking_requests,'booking_services':booking_services,'email_events':email_events,'note':'Video binary files must be downloaded separately from their project pages.'}

@app.post('/api/account/delete')
def account_delete(body:AccountRemoval,response:Response,user=Depends(get_user)):
    with connect() as con:
        account=con.execute('SELECT salt,password_hash FROM users WHERE id=?',(user['id'],)).fetchone()
        active=con.execute('SELECT COUNT(*) FROM projects WHERE salon_id=? AND state IN ("queued","processing")',(user['salon_id'],)).fetchone()[0]
    if active:raise HTTPException(409,'Wait for active video processing to finish before deleting account')
    if not hmac.compare_digest(salted(body.password,account['salt']),account['password_hash']):
        raise HTTPException(401,'Incorrect password')
    with connect() as con:
        con.execute('DELETE FROM activity WHERE salon_id=?',(user['salon_id'],))
        con.execute('DELETE FROM scheduled_posts WHERE salon_id=?',(user['salon_id'],))
        con.execute('DELETE FROM assets WHERE project_id IN (SELECT id FROM projects WHERE salon_id=?)',(user['salon_id'],))
        con.execute('DELETE FROM projects WHERE salon_id=?',(user['salon_id'],))
        con.execute('DELETE FROM salons WHERE id=?',(user['salon_id'],))
        con.execute('DELETE FROM users WHERE id=?',(user['id'],))
    shutil.rmtree(DATA/'salons'/user['salon_id'],ignore_errors=True)
    response.delete_cookie('bf_session',path='/')
    return {'ok':True,'deleted':True}

@app.get('/api/ready')
def ready():
    import shutil as _shutil
    try:
        with connect() as con: con.execute('SELECT 1').fetchone()
        if _shutil.which('ffmpeg') is None or _shutil.which('ffprobe') is None:
            raise RuntimeError('Video codecs unavailable')
        if _shutil.disk_usage(DATA).free < 20*1024*1024:
            raise RuntimeError('Insufficient storage')
    except Exception:
        raise HTTPException(503,'Service not ready')
    return {'ready':True,'video_editor':'ffmpeg','storage':'mounted'}

PLATFORMS={'instagram','tiktok','youtube','facebook'}
class CalendarCreate(BaseModel):
    project_id:str
    platform:str
    caption:str=Field(min_length=1,max_length=2200)
    scheduled_at:datetime

class CalendarUpdate(BaseModel):
    state:str=Field(pattern='^(planned|published_manual)$')

def validate_schedule(dt):
    if dt.tzinfo is None:raise HTTPException(400,'Scheduled time must contain a timezone')
    utc=dt.astimezone(timezone.utc)
    if not datetime.now(timezone.utc)-timedelta(days=1)<=utc<=datetime.now(timezone.utc)+timedelta(days=730):
        raise HTTPException(400,'Scheduled time must be within two years')
    return utc.isoformat()

def calendar_payload(r):return dict(r)

@app.get('/api/calendar')
def calendar_list(user=Depends(get_user)):
    with connect() as con:
        rows=con.execute('SELECT s.*,p.title AS project_title,p.state AS project_state FROM scheduled_posts s JOIN projects p ON p.id=s.project_id AND p.salon_id=s.salon_id WHERE s.salon_id=? ORDER BY s.scheduled_at LIMIT 250',(user['salon_id'],)).fetchall()
    return {'posts':[calendar_payload(r) for r in rows],'automatic_publishing':False}

@app.post('/api/calendar',status_code=201)
def calendar_add(body:CalendarCreate,user=Depends(get_user)):
    if body.platform not in PLATFORMS:raise HTTPException(400,'Unsupported platform')
    p=own_project(body.project_id,user)
    if p['state']!='ready':raise HTTPException(409,'The video must be ready before planning')
    when=validate_schedule(body.scheduled_at)
    with connect() as con:
        count=con.execute('SELECT COUNT(*) FROM scheduled_posts WHERE salon_id=?',(user['salon_id'],)).fetchone()[0]
        if count>=250:raise HTTPException(429,'Calendar entry limit reached')
        k=uid();t=now()
        con.execute('INSERT INTO scheduled_posts VALUES (?,?,?,?,?,?,?,?,?)',(k,user['salon_id'],body.project_id,body.platform,body.caption.strip(),when,'planned',t,t))
    activity(user['salon_id'],body.project_id,'Content plan created')
    return {'id':k,'state':'planned','scheduled_at':when,'automatic_publishing':False}

@app.patch('/api/calendar/{entry_id}')
def calendar_update(entry_id:str,body:CalendarUpdate,user=Depends(get_user)):
    with connect() as con:
        row=con.execute('UPDATE scheduled_posts SET state=?,updated_at=? WHERE id=? AND salon_id=? RETURNING id,state',(body.state,now(),entry_id,user['salon_id'])).fetchone()
    if row is None:raise HTTPException(404,'Calendar item not found')
    return dict(row)

@app.delete('/api/calendar/{entry_id}')
def calendar_delete(entry_id:str,user=Depends(get_user)):
    with connect() as con:
        row=con.execute('DELETE FROM scheduled_posts WHERE id=? AND salon_id=? RETURNING id',(entry_id,user['salon_id'])).fetchone()
    if row is None:raise HTTPException(404,'Calendar item not found')
    return {'ok':True}

def ics_escape(s):return s.replace('\\','\\\\').replace(';','\\;').replace(',','\\,').replace('\n','\\n').replace('\r','')

@app.get('/api/calendar.ics')
def calendar_export(user=Depends(get_user)):
    with connect() as con:
        rows=con.execute('SELECT s.*,p.title FROM scheduled_posts s JOIN projects p ON p.id=s.project_id AND p.salon_id=s.salon_id WHERE s.salon_id=? ORDER BY s.scheduled_at',(user['salon_id'],)).fetchall()
    lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BARBERFLOW//CONTENT PLAN//EN','CALSCALE:GREGOR']
    for row in rows:
        when=datetime.fromisoformat(row['scheduled_at']).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        lines+=['BEGIN:VEVENT','UID:'+row['id']+'@barberflow','DTSTAMP:'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),'DTSTART:'+when,'SUMMARY:'+ics_escape(row['platform'].title()+' · '+row['title']),'DESCRIPTION:'+ics_escape(row['caption']),'END:VEVENT']
    lines+=['END:VCALENDAR']
    return Response(content='\r\n'.join(lines)+'\r\n',media_type='text/calendar',headers={'Content-Disposition':'attachment; filename="barberflow-plan.ics"'})

from .bookings import install_booking_routes
install_booking_routes(app, connect, get_user, throttle, uid, now)

app.mount('/static',StaticFiles(directory=ROOT/'app'/'static'),name='static')
@app.get('/')
def home():return FileResponse(ROOT/'app'/'static'/'index.html')
