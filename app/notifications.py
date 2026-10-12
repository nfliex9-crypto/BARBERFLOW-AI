"""Durable, opt-in SMTP notification outbox.

Only an independently started worker sends messages.  A successful SMTP acceptance
is not proof of inbox delivery. No credentials or recipient addresses enter logs.
"""
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import os
import smtplib
import sqlite3
import ssl
import time
import uuid


def now_utc():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def init_outbox(con):
    con.executescript("""
CREATE TABLE IF NOT EXISTS bf_mail_outbox (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL REFERENCES bf_bookings(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT NOT NULL,
    claimed_at TEXT,
    smtp_accepted_at TEXT,
    error_type TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(booking_id,kind)
);
CREATE INDEX IF NOT EXISTS bf_outbox_jobs ON bf_mail_outbox(state,next_attempt_at,claimed_at);
CREATE TABLE IF NOT EXISTS bf_mail_worker (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),
    last_heartbeat TEXT NOT NULL
);
""")


def enabled():
    """Explicit opt-in: do not send personal information without configuration."""
    return os.getenv("BF_SMTP_ENABLED","false").lower() in ("1","true","yes")


def config_ready():
    return enabled() and bool(os.getenv("BF_SMTP_HOST")) and bool(os.getenv("BF_SMTP_FROM"))


def enqueue(con, salon_id, booking_id, kind, recipient, subject, message):
    if not config_ready():
        return False
    now = now_utc()
    inserted = con.execute("""INSERT OR IGNORE INTO bf_mail_outbox
        (id,salon_id,booking_id,kind,recipient,subject,body,state,attempts,next_attempt_at,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
        (str(uuid.uuid4()),salon_id,booking_id,kind,recipient,subject,message,
         "pending",0,now,now))
    return inserted.rowcount == 1



def update_heartbeat(con):
    con.execute("""INSERT INTO bf_mail_worker(singleton,last_heartbeat) VALUES(1,?)
        ON CONFLICT(singleton) DO UPDATE SET last_heartbeat=excluded.last_heartbeat""", (now_utc(),))


def worker_alive(con):
    heartbeat=con.execute("SELECT last_heartbeat FROM bf_mail_worker WHERE singleton=1").fetchone()
    if heartbeat is None:
        return False
    try:
        checked=datetime.strptime(heartbeat["last_heartbeat"],"%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc)-checked).total_seconds() < 75
    except (ValueError,TypeError):
        return False


def claim(con):
    """Atomic claim; retries stale worker claims after 10 minutes."""
    now = now_utc()
    stale = (datetime.now(timezone.utc)-timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    con.execute("BEGIN IMMEDIATE")
    entry = con.execute("""SELECT * FROM bf_mail_outbox WHERE attempts < 5
        AND ((state='pending' AND next_attempt_at <= ?) OR
             (state='processing' AND claimed_at < ?))
        ORDER BY created_at LIMIT 1""", (now,stale)).fetchone()
    if not entry:
        con.commit()
        return None
    con.execute("UPDATE bf_mail_outbox SET state='processing',attempts=attempts+1,claimed_at=? WHERE id=?",
                (now,entry["id"]))
    con.commit()
    return dict(entry)


def deliver(job):
    if not config_ready():
        raise RuntimeError("SMTP not configured")
    host = os.environ["BF_SMTP_HOST"]
    port = int(os.getenv("BF_SMTP_PORT","587"))
    security = os.getenv("BF_SMTP_SECURITY","starttls").lower()
    if security not in ("starttls","ssl"):
        raise ValueError("Only TLS-protected SMTP is supported")
    sender = os.environ["BF_SMTP_FROM"]
    user = os.getenv("BF_SMTP_USER")
    password = os.getenv("BF_SMTP_PASSWORD")
    if bool(user) != bool(password):
        raise RuntimeError("SMTP username and password must be configured together")
    msg = EmailMessage()
    msg["From"],msg["To"],msg["Subject"] = sender,job["recipient"],job["subject"]
    msg.set_content(job["body"])
    context=ssl.create_default_context()
    if security == "ssl":
        with smtplib.SMTP_SSL(host,port,timeout=20,context=context) as smtp:
            if user: smtp.login(user,password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host,port,timeout=20) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            if user: smtp.login(user,password)
            smtp.send_message(msg)


def run_once(connect, send=deliver):
    if not config_ready():
        return {"status":"disabled"}
    with connect() as con:
        update_heartbeat(con)
        job = claim(con)
    if not job:
        return {"status":"idle"}
    try:
        send(job)
    except Exception as error:
        error_type = type(error).__name__[:90]
        attempts = job["attempts"] + 1
        next_time=(datetime.now(timezone.utc)+timedelta(seconds=min(30*2**attempts,3600))).strftime("%Y-%m-%dT%H:%M:%SZ")
        with connect() as con:
            con.execute("""UPDATE bf_mail_outbox
                SET state=?,next_attempt_at=?,error_type=?,claimed_at=NULL WHERE id=?""",
                ("failed" if attempts>=5 else "pending",next_time,error_type,job["id"]))
        return {"status":"failed_attempt","error_type":error_type,"attempt":attempts}
    with connect() as con:
        con.execute("""UPDATE bf_mail_outbox
            SET state='smtp_accepted',smtp_accepted_at=?,error_type=NULL,claimed_at=NULL WHERE id=?""",
            (now_utc(),job["id"]))
    return {"status":"smtp_accepted","note":"SMTP accepted the message, not confirmed inbox delivery"}


def run_forever(connect, seconds=15):
    if not config_ready():
        raise RuntimeError("BF_SMTP_ENABLED, BF_SMTP_HOST and BF_SMTP_FROM are required")
    while True:
        result=run_once(connect)
        if result["status"] in ("idle","failed_attempt"):
            time.sleep(seconds)


if __name__ == "__main__":
    from .main import connect
    run_forever(connect)
