"""Tests against the real FastAPI HTTP layer and FFmpeg rendering, no paid APIs."""
import os
import tempfile
from pathlib import Path
import subprocess
import time
import uuid

os.environ['BF_DATA_DIR'] = tempfile.mkdtemp(prefix='barberflow-test-')
os.environ['BF_OUTPUT_WIDTH']='360'
os.environ['BF_OUTPUT_HEIGHT']='640'
os.environ['APP_ENV']='development'
from fastapi.testclient import TestClient
from app.main import app, RATE_WINDOWS, RATE_LOCK
import pytest

@pytest.fixture(autouse=True)
def reset_limiter():
    with RATE_LOCK:
        RATE_WINDOWS.clear()


def register(client,email=None,salon='Studio One'):
    email = email or f'{uuid.uuid4()}@example.com'
    result = client.post('/api/auth/register',json={'email':email,'password':'VeryStrongPassword123!','name':'Alex Test','salon_name':salon})
    assert result.status_code==200,result.text
    return result.json()['user']


def video_bytes(tmp_path):
    target=tmp_path/'sample.mp4'
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x288:rate=15','-t','2','-c:v','libx264','-pix_fmt','yuv420p',str(target)],check=True,timeout=40)
    return target.read_bytes()


def test_auth_and_salon_isolation():
    with TestClient(app) as a, TestClient(app) as b:
        assert a.get('/api/projects').status_code==401
        usera=register(a,salon='First Shop')
        userb=register(b,salon='Second Shop')
        assert usera['salon_id']!=userb['salon_id']
        assert a.get('/api/auth/me').json()['user']['salon']=='First Shop'
        assert b.get('/api/auth/me').json()['user']['salon']=='Second Shop'
        assert a.patch('/api/salon',json={'name':'First Renovated'}).status_code==200
        assert b.get('/api/auth/me').json()['user']['salon']=='Second Shop'
        assert a.post('/api/auth/logout').status_code==200
        assert a.get('/api/projects').status_code==401


def test_register_validation_and_origin():
    with TestClient(app) as c:
        assert c.post('/api/auth/register',json={'email':'hello','password':'123','name':'One','salon_name':'Studio'}).status_code==400
        assert c.post('/api/auth/register',json={'email':'example@test.com','password':'VeryStrong12345','name':'One','salon_name':'Studio'},headers={'Origin':'https://evil.example'}).status_code==403


def test_upload_process_render_download_and_isolation(tmp_path):
    with TestClient(app) as a, TestClient(app) as b:
        register(a,salon='Fresh Fade');register(b,salon='Other Salon')
        contents=video_bytes(tmp_path)
        files={'files':('cut.mp4',contents,'video/mp4')}
        data={'title':'Skin Fade','style':'cinematic','mode':'long','consent':'true'}
        result=a.post('/api/projects',files=files,data=data)
        assert result.status_code==201,result.text
        pid=result.json()['id']
        assert b.get(f'/api/projects/{pid}').status_code==404
        assert b.get(f'/api/projects/{pid}/video').status_code==404
        assert a.post(f'/api/projects/{pid}/retry').status_code==409
        for _ in range(80):
            pr=a.get(f'/api/projects/{pid}').json()
            if pr['state'] in ('ready','failed'):break
            time.sleep(.25)
        assert pr['state']=='ready',pr
        assert pr['output_duration']>0
        assert a.get(f'/api/projects/{pid}/video').status_code==200
        download=a.get(f'/api/projects/{pid}/download')
        assert download.status_code==200
        assert download.content[4:8]==b'ftyp'
        assert a.get(f'/api/projects/{pid}/thumbnail').headers['content-type']=='image/jpeg'
        assert 'Skin Fade' in a.get(f'/api/projects/{pid}/caption').json()['caption']
        stats=a.get('/api/stats').json()
        assert stats['completed']>=1
        assert a.delete(f'/api/projects/{pid}').status_code==200
        assert a.get(f'/api/projects/{pid}').status_code==404


def test_reject_fake_video(tmp_path):
    with TestClient(app) as c:
        register(c)
        result=c.post('/api/projects',data={'title':'Bad file','mode':'long','style':'bold','consent':'true'},files={'files':('bad.mp4',b'not-a-video'*300,'video/mp4')})
        assert result.status_code==400
        assert not c.get('/api/projects').json()['projects']

def test_multiple_clips_with_music_and_mode_validation(tmp_path):
    with TestClient(app) as c:
        register(c,salon='Motion Studio')
        sample=video_bytes(tmp_path)
        soundtrack=tmp_path/'music.m4a'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','9','-c:a','aac',str(soundtrack)],check=True,timeout=40)
        files=[('files',('before.mp4',sample,'video/mp4')),('files',('after.mp4',sample,'video/mp4'))]
        rejected=c.post('/api/projects',files=files,data={'title':'Two clips','style':'clean','mode':'long','consent':'true'})
        assert rejected.status_code==400
        accepted=c.post('/api/projects',files=files+[('music',('music.m4a',soundtrack.read_bytes(),'audio/mp4'))],data={'title':'Two clips','style':'clean','mode':'clips','consent':'true'})
        assert accepted.status_code==201,accepted.text
        pid=accepted.json()['id']
        for _ in range(90):
            pr=c.get(f'/api/projects/{pid}').json()
            if pr['state'] in ('ready','failed'):break
            time.sleep(.25)
        assert pr['state']=='ready',pr
        data=c.get(f'/api/projects/{pid}/video').content
        assert len(data)>1000
        target=tmp_path/'out.mp4';target.write_bytes(data)
        from app.engine import probe
        assert probe(target)['audio'] is True


def test_calendar_reminders_with_ics_and_cross_salon_isolation(tmp_path):
    from datetime import datetime, timedelta, timezone
    with TestClient(app) as a, TestClient(app) as b:
        register(a, salon='Planned Cuts')
        register(b, salon='Different Cuts')
        sample=video_bytes(tmp_path)
        created=a.post('/api/projects',data={'title':'High fade reveal','style':'clean','mode':'long','consent':'true','target_seconds':'15'},files={'files':('fade.mp4',sample,'video/mp4')})
        assert created.status_code==201, created.text
        pid=created.json()['id']
        for _ in range(90):
            p=a.get('/api/projects/'+pid).json()
            if p['state'] in ('ready','failed'): break
            time.sleep(.2)
        assert p['state']=='ready', p
        assert p['target_seconds']==15
        date=(datetime.now(timezone.utc)+timedelta(days=2)).isoformat()
        payload={'project_id':pid,'platform':'instagram','caption':'Fresh cut ✂️, book now!','scheduled_at':date}
        assert b.post('/api/calendar',json=payload).status_code==404
        item=a.post('/api/calendar',json=payload)
        assert item.status_code==201,item.text
        assert item.json()['automatic_publishing'] is False
        entry=item.json()['id']
        assert len(a.get('/api/calendar').json()['posts'])==1
        assert len(b.get('/api/calendar').json()['posts'])==0
        ics=a.get('/api/calendar.ics')
        assert ics.status_code==200
        assert 'BEGIN:VCALENDAR' in ics.text
        assert 'High fade reveal' in ics.text
        assert b.patch('/api/calendar/'+entry,json={'state':'published_manual'}).status_code==404
        marked=a.patch('/api/calendar/'+entry,json={'state':'published_manual'})
        assert marked.status_code==200
        assert a.delete('/api/calendar/'+entry).status_code==200
        assert a.get('/api/calendar').json()['posts']==[]


def test_calendar_validates_timezone_and_platform(tmp_path):
    from datetime import datetime, timezone
    with TestClient(app) as c:
        register(c)
        payload={'project_id':'missing','platform':'spotify','caption':'Caption','scheduled_at':datetime.now(timezone.utc).isoformat()}
        assert c.post('/api/calendar',json=payload).status_code==400
        payload['platform']='youtube'
        assert c.post('/api/calendar',json=payload).status_code==404
        assert c.get('/api/calendar.ics').status_code==200


def test_invalid_duration_rejected_early(tmp_path):
    with TestClient(app) as c:
        register(c)
        payload={'title':'Example fade','mode':'long','style':'bold','consent':'true','target_seconds':'999'}
        assert c.post('/api/projects',data=payload,files={'files':('bad.mp4',b'F'*2000,'video/mp4')}).status_code==400
        assert c.get('/api/projects').json()['projects']==[]


def test_user_data_export_and_permanent_deletion():
    with TestClient(app) as c:
        register(c,salon='Erase Salon')
        assert c.get('/api/ready').json()['ready'] is True
        exported=c.get('/api/account/export')
        assert exported.status_code==200
        assert exported.json()['user']['salon']=='Erase Salon'
        assert c.post('/api/account/delete',json={'password':'wrong'}).status_code==401
        result=c.post('/api/account/delete',json={'password':'VeryStrongPassword123!'})
        assert result.status_code==200
        assert c.get('/api/auth/me').status_code==401
