"""Offline, deterministic, privacy-preserving editing engine (not generative AI)."""
import json
import math
import os
from pathlib import Path
import subprocess
import time

FFMPEG = os.getenv("FFMPEG_BIN", "ffmpeg")
FFPROBE = os.getenv("FFPROBE_BIN", "ffprobe")


def probe(path):
    res = subprocess.run([FFPROBE, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)], capture_output=True, text=True, timeout=40)
    if res.returncode:
        raise ValueError('Unsupported or invalid video file')
    data = json.loads(res.stdout)
    streams = [s for s in data.get('streams',[]) if s.get('codec_type')=='video']
    if not streams:
        raise ValueError('No video stream found')
    v = streams[0]
    duration = float(data.get('format',{}).get('duration') or v.get('duration') or 0)
    if duration <= 0 or duration > 60*90:
        raise ValueError('Video duration is unsupported')
    return {'duration': duration, 'width':int(v.get('width',0)), 'height':int(v.get('height',0)), 'audio':any(s.get('codec_type') == 'audio' for s in data['streams'])}


def _sharpness(path, secs):
    """Non-AI quality heuristic. Safe fallback if OpenCV cannot decode a frame."""
    try:
        import cv2
        cap = cv2.VideoCapture(str(path))
        cap.set(cv2.CAP_PROP_POS_MSEC, secs*1000)
        ok, img = cap.read()
        cap.release()
        if not ok: return 0.0
        gray = cv2.cvtColor(cv2.resize(img, (320, 180)), cv2.COLOR_BGR2GRAY)
        focus = min(float(cv2.Laplacian(gray, cv2.CV_64F).var()),500) / 500
        brightness = float(gray.mean())
        exposure = 1 - min(abs(brightness-125)/125,1)
        return focus*.65+exposure*.35
    except Exception:
        return 0.5


def edit_plan(files, maximum_seconds=24):
    """Preserves the original order: a likely before, intermediate details and final reveal."""
    if not files:
        raise ValueError('No video files')
    infos = [probe(p) for p in files]
    total = sum(i['duration'] for i in infos)
    if total > 45*60:
        raise ValueError('Total uploaded video exceeds 45 minutes')
    # Candidate windows are sampled locally. This is not semantic hair-style recognition.
    candidates=[]
    cursor=0.0
    for idx,(file,meta) in enumerate(zip(files,infos)):
        d = meta['duration']
        window = min(4.0,max(0.6,d/3))
        positions = [min(float(t),max(0,d-window)) for t in [0,d*.18,d*.35,d*.55,d*.72,max(0,d-window)]]
        for s in sorted(set(round(p,2) for p in positions)):
            candidates.append({'file_index':idx,'start':s,'duration':min(window,d-s),'timeline':cursor+s,'score':_sharpness(file,s+min(window/2,1.2))})
        cursor+=d
    candidates.sort(key=lambda c:c['timeline'])
    # Anchor earliest usable footage and final reveal, pick sharp intermediate highlights.
    first = candidates[0]
    last = candidates[-1]
    intermediates = [c for c in candidates[1:-1] if c['timeline'] - first['timeline']>2 and last['timeline'] - c['timeline']>2]
    rank = sorted(intermediates,key=lambda x:x['score'],reverse=True)
    selected=[first]
    for c in rank:
        if len(selected)>=5: break
        if all(abs(c['timeline'] - s['timeline'])>=min(c['duration'],s['duration'])*.85 for s in selected): selected.append(c)
    if last['timeline'] != first['timeline'] and all(abs(last['timeline']-s['timeline'])>=min(last['duration'],s['duration'])*.6 for s in selected):
        selected.append(last)
    selected.sort(key=lambda x:x['timeline'])
    # Cap output duration by proportional shortening.
    duration_sum = sum(c['duration'] for c in selected)
    if duration_sum>maximum_seconds:
        factor = maximum_seconds/duration_sum
        for c in selected: c['duration']=round(c['duration']*factor,2)
    return selected


def render(files, output, thumb, brand, style='cinematic', music=None, width=720, height=1280, maximum_seconds=24):
    if maximum_seconds not in (15,24,30,45):raise ValueError('Invalid maximum video duration')
    plan=edit_plan(files,maximum_seconds=maximum_seconds)
    output=Path(output); output.parent.mkdir(parents=True,exist_ok=True)
    brand_file=output.parent/'brand.txt'
    brand_file.write_text(' '.join((brand[:45] or 'BARBERFLOW').split()),encoding='utf-8')
    font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    if not Path(font).exists():
        import glob
        available=glob.glob('/usr/share/fonts/**/*Sans*.ttf',recursive=True)
        font=available[0] if available else ''
    styles={'cinematic':(1.12,1.13,0.96),'clean':(1.02,1.04,1.05),'bold':(1.18,1.34,1.0)}
    contrast,saturation,brightness=styles.get(style,styles['cinematic'])
    args=[FFMPEG,'-hide_banner','-nostdin','-loglevel','error','-y']
    for c in plan:
        args += ['-ss',str(c['start']),'-t',str(c['duration']),'-i',str(files[c['file_index']])]
    music_idx=None
    if music:
        music_idx=len(plan)
        args += ['-stream_loop','-1','-i',str(music)]
    filters=[]
    for i,c in enumerate(plan):
        label = 'THE REVEAL' if i==len(plan)-1 else ('BEFORE' if i==0 else 'THE PROCESS')
        base=(f'[{i}:v]fps=30,scale={width}:{height}:force_original_aspect_ratio=increase,'
              f'crop={width}:{height},setsar=1,format=yuv420p,'
              f'eq=contrast={contrast}:saturation={saturation}:brightness={brightness-1:.3f}')
        if font:
            base+=(f',drawbox=x=0:y=0:w=iw:h=160:color=black@0.25:t=fill,'
                   f"drawtext=fontfile='{font}':text='{label}':fontcolor=white:fontsize={max(24,width//18)}:x=(w-text_w)/2:y=60")
        if font and i==len(plan)-1:
            # Original source is preserved; branding is drawn directly on the closing frame.
            base+=(f',drawbox=x=0:y=ih-138:w=iw:h=138:color=black@0.48:t=fill,'
                   f"drawtext=fontfile='{font}':textfile='{brand_file}':expansion=none:"
                   f'fontcolor=white:fontsize={max(21,width//22)}:x=(w-text_w)/2:y=h-94')
        filters.append(base+f'[v{i}]')
    filters.append(''.join(f'[v{i}]' for i in range(len(plan)))+f'concat=n={len(plan)}:v=1:a=0[outv]')
    args += ['-filter_complex',';'.join(filters),'-map','[outv]']
    duration=sum(float(c['duration']) for c in plan)
    if music_idx is not None:
        args += ['-map',f'{music_idx}:a:0','-af',f'volume=0.55,afade=t=out:st={max(0,duration-1):.2f}:d=1','-t',str(duration),'-c:a','aac','-b:a','128k']
    else:
        args+=['-an']
    args+=['-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(output)]
    started=time.time()
    process=subprocess.run(args,capture_output=True,text=True,timeout=600)
    if process.returncode:
        raise RuntimeError((process.stderr or 'FFmpeg render failed')[-2000:])
    thumb_task=subprocess.run([FFMPEG,'-hide_banner','-nostdin','-loglevel','error','-y','-ss',str(min(1,max(.1,duration*.25))),'-i',str(output),'-frames:v','1','-vf','scale=360:-2',str(thumb)],capture_output=True,text=True,timeout=45)
    if thumb_task.returncode:
        raise RuntimeError('Video produced but thumbnail creation failed')
    return {'duration':round(duration,1),'plan':plan,'render_seconds':round(time.time()-started,1)}
