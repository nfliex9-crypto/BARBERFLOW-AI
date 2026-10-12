"""BarberFlow bookings pilot: manual confirmation, Brussels time and salon isolation."""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import re
from .scheduling import init_schedule, hours_for, ensure_hours, valid_slot, slots_for, validate_hours, ZONE
from .notifications import init_outbox, enqueue, config_ready, worker_alive

from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel, Field

ZONE = ZoneInfo("Europe/Brussels")
OPEN = time(9, 0)
CLOSE = time(18, 0)
OPEN_WEEKDAYS = {1, 2, 3, 4, 5}  # Tuesday to Saturday — configurable in a later iteration


class ServiceNew(BaseModel):
    name: str = Field(min_length=2, max_length=65)
    duration_minutes: int = Field(ge=15, le=180, multiple_of=15)
    price_cents: int = Field(ge=0, le=250000)


class ServiceState(BaseModel):
    active: bool


class WorkHoursUpdate(BaseModel):
    enabled: bool
    opens: str = Field(min_length=5, max_length=5)
    closes: str = Field(min_length=5, max_length=5)
    break_start: str | None = None
    break_end: str | None = None


class ClosingDate(BaseModel):
    day: date
    reason: str = Field(default="", max_length=120)


class BookingRequest(BaseModel):
    service_id: str
    starts_at: datetime
    customer_name: str = Field(min_length=2, max_length=70)
    customer_email: str = Field(min_length=5, max_length=200)
    customer_phone: str = Field(default="", max_length=35)
    privacy_accepted: bool


class BookingState(BaseModel):
    state: str = Field(pattern="^(confirmed|declined|cancelled)$")


def stamp(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def slot_start(raw: datetime, duration: int):
    if raw.tzinfo is None or raw.utcoffset() is None:
        raise HTTPException(400, "Appointment time must include an explicit timezone offset")
    local = raw.astimezone(ZONE)
    if local.weekday() not in OPEN_WEEKDAYS:
        raise HTTPException(400, "Salon is closed on that day")
    if local.second or local.microsecond or local.minute % 30:
        raise HTTPException(400, "Start at a full or half hour")
    if local.time().replace(tzinfo=None) < OPEN or (local + timedelta(minutes=duration)).time().replace(tzinfo=None) > CLOSE:
        raise HTTPException(400, "Outside pilot opening hours (09:00–18:00)")
    utc = raw.astimezone(timezone.utc)
    current = datetime.now(timezone.utc)
    if utc < current + timedelta(hours=2) or utc > current + timedelta(days=60):
        raise HTTPException(400, "Choose a time between 2 hours and 60 days ahead")
    return stamp(utc), stamp(utc + timedelta(minutes=duration))


def conflict(con, salon_id, start, end):
    return con.execute("""SELECT 1 FROM bf_bookings WHERE salon_id=? AND state='confirmed'
       AND starts_at < ? AND ends_at > ? LIMIT 1""", (salon_id, end, start)).fetchone() is not None


def install_booking_routes(app, connect, get_user, throttle, uid, now):
    """Attach to the existing FastAPI app without changing its FFmpeg video services."""
    with connect() as con:
        con.executescript("""
CREATE TABLE IF NOT EXISTS bf_services (
 id TEXT PRIMARY KEY, salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 name TEXT NOT NULL, duration_minutes INTEGER NOT NULL, price_cents INTEGER NOT NULL,
 active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bf_service_salon ON bf_services(salon_id, active);
CREATE TABLE IF NOT EXISTS bf_bookings (
 id TEXT PRIMARY KEY, salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
 service_id TEXT NOT NULL REFERENCES bf_services(id), customer_name TEXT NOT NULL,
 customer_email TEXT NOT NULL, customer_phone TEXT NOT NULL,
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 state TEXT NOT NULL, consent_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bf_booking_slots ON bf_bookings(salon_id, state, starts_at, ends_at);
""")
        init_schedule(con)
        init_outbox(con)

    def get_salon(con, sid):
        salon = con.execute("SELECT id,name FROM salons WHERE id=?", (sid,)).fetchone()
        if not salon:
            raise HTTPException(404, "Salon not found")
        ensure_hours(con, sid)
        return salon

    def find_service(con, sid, service_id):
        svc = con.execute("SELECT * FROM bf_services WHERE id=? AND salon_id=? AND active=1",
                          (service_id, sid)).fetchone()
        if not svc:
            raise HTTPException(404, "Service not found")
        return svc

    @app.get("/api/bookings/link")
    def booking_link(user=Depends(get_user)):
        return {"booking_page": f'/static/book.html?salon={user["salon_id"]}',
                "management_page": "/static/bookings.html",
                "note": "Requests are pending until manually confirmed. No notifications are sent."}

    @app.get("/api/bookings/services")
    def admin_services(user=Depends(get_user)):
        with connect() as con:
            rows = con.execute("SELECT id,name,duration_minutes,price_cents,active FROM bf_services WHERE salon_id=? ORDER BY created_at",
                               (user["salon_id"],)).fetchall()
        return {"services": [dict(r) for r in rows]}

    @app.post("/api/bookings/services", status_code=201)
    def create_service(body: ServiceNew, user=Depends(get_user)):
        with connect() as con:
            n = con.execute("SELECT COUNT(*) FROM bf_services WHERE salon_id=?", (user["salon_id"],)).fetchone()[0]
            if n >= 30:
                raise HTTPException(429, "Service limit reached")
            sid = uid()
            con.execute("INSERT INTO bf_services VALUES (?,?,?,?,?,?,?)",
                        (sid, user["salon_id"], body.name.strip(), body.duration_minutes, body.price_cents, 1, now()))
        return {"id": sid, "name": body.name.strip(), "duration_minutes": body.duration_minutes,
                "price_cents": body.price_cents, "active": True}

    @app.patch("/api/bookings/services/{service_id}")
    def change_service(service_id: str, body: ServiceState, user=Depends(get_user)):
        with connect() as con:
            updated = con.execute("UPDATE bf_services SET active=? WHERE id=? AND salon_id=? RETURNING id,active",
                                  (int(body.active), service_id, user["salon_id"])).fetchone()
        if not updated:
            raise HTTPException(404, "Service not found")
        return dict(updated)


    @app.get("/api/bookings/hours")
    def admin_hours(user=Depends(get_user)):
        with connect() as con:
            return {"hours": hours_for(con, user["salon_id"]), "timezone": "Europe/Brussels"}

    @app.put("/api/bookings/hours/{weekday}")
    def update_hours(weekday: int, body: WorkHoursUpdate, user=Depends(get_user)):
        if not 0 <= weekday <= 6:
            raise HTTPException(400, "Weekday must be 0=Monday through 6=Sunday")
        validate_hours(body.opens, body.closes, body.break_start, body.break_end, body.enabled)
        with connect() as con:
            ensure_hours(con, user["salon_id"])
            con.execute("""UPDATE bf_work_hours
                SET enabled=?,opens=?,closes=?,break_start=?,break_end=?
                WHERE salon_id=? AND weekday=?""",
                (int(body.enabled),body.opens,body.closes,body.break_start,body.break_end,
                 user["salon_id"],weekday))
        return {"weekday": weekday, "saved": True,
                "warning": "Existing confirmed bookings are not cancelled automatically"}

    @app.get("/api/bookings/closures")
    def admin_closures(user=Depends(get_user)):
        with connect() as con:
            rows = con.execute("""SELECT day,reason FROM bf_closed_dates WHERE salon_id=?
                ORDER BY day LIMIT 365""", (user["salon_id"],)).fetchall()
        return {"closures": [dict(r) for r in rows]}

    @app.post("/api/bookings/closures", status_code=201)
    def add_closure(body: ClosingDate, user=Depends(get_user)):
        today = datetime.now(ZONE).date()
        if body.day < today or body.day > today + timedelta(days=730):
            raise HTTPException(400, "Closure date outside permitted range")
        with connect() as con:
            get_salon(con, user["salon_id"])
            con.execute("""INSERT INTO bf_closed_dates(salon_id,day,reason) VALUES(?,?,?)
                ON CONFLICT(salon_id,day) DO UPDATE SET reason=excluded.reason""",
                (user["salon_id"],body.day.isoformat(),body.reason.strip()))
        return {"day": body.day.isoformat(), "saved": True,
                "warning": "Contact customers with existing confirmed bookings manually"}

    @app.delete("/api/bookings/closures/{day}")
    def remove_closure(day: date, user=Depends(get_user)):
        with connect() as con:
            result = con.execute("""DELETE FROM bf_closed_dates
                WHERE salon_id=? AND day=? RETURNING day""",
                (user["salon_id"],day.isoformat())).fetchone()
        if result is None:
            raise HTTPException(404, "Closure not found")
        return {"removed": True}

    @app.get("/api/public/salons/{salon_id}")
    def public_salon(salon_id: str):
        with connect() as con:
            salon = get_salon(con, salon_id)
            services = con.execute("SELECT id,name,duration_minutes,price_cents FROM bf_services WHERE salon_id=? AND active=1 ORDER BY created_at",
                                   (salon_id,)).fetchall()
            schedule = hours_for(con, salon_id)
        return {"name": salon["name"], "services": [dict(s) for s in services],
                "timezone": "Europe/Brussels", "schedule": schedule,
                "booking_mode": "request_only"}

    @app.get("/api/public/salons/{salon_id}/slots")
    def public_slots(salon_id: str, service_id: str, day: date):
        with connect() as con:
            get_salon(con, salon_id)
            svc = find_service(con, salon_id, service_id)
            starts = slots_for(con, salon_id, day, svc["duration_minutes"], conflict)
        return {"slots": starts, "timezone": "Europe/Brussels", "booking_mode": "request_only"}

    @app.post("/api/public/salons/{salon_id}/requests", status_code=201)
    def request_booking(salon_id: str, body: BookingRequest, request: Request):
        throttle(request, "booking-request", 12, 3600)
        if not body.privacy_accepted:
            raise HTTPException(400, "Consent to store contact details for appointment handling is required")
        name, email, phone = body.customer_name.strip(), body.customer_email.strip().lower(), body.customer_phone.strip()
        if len(name) < 2 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(400, "Valid name and email required")
        with connect() as con:
            con.execute("BEGIN IMMEDIATE")
            get_salon(con, salon_id)
            svc = find_service(con, salon_id, body.service_id)
            start, end = valid_slot(con, salon_id, body.starts_at, svc["duration_minutes"])
            if conflict(con, salon_id, start, end):
                raise HTTPException(409, "This slot is already confirmed")
            duplicate = con.execute("""SELECT id FROM bf_bookings WHERE salon_id=? AND service_id=?
             AND customer_email=? AND starts_at=? AND state='pending' LIMIT 1""",
             (salon_id, body.service_id, email, start)).fetchone()
            if duplicate:
                raise HTTPException(409, "A request for this appointment already exists")
            bid, t = uid(), now()
            con.execute("INSERT INTO bf_bookings VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                        (bid, salon_id, body.service_id, name, email, phone,
                         start, end, "pending", t, t, t))
            owner = con.execute("""SELECT u.email FROM users u JOIN salons s ON s.owner_id=u.id
                WHERE s.id=?""", (salon_id,)).fetchone()
            salon = get_salon(con, salon_id)
            queued = enqueue(con,salon_id,bid,"new_request",owner["email"],
                             "New appointment request — " + salon["name"],
                             "A customer requested " + svc["name"] + " at " +
                             body.starts_at.astimezone(ZONE).strftime("%d/%m/%Y %H:%M") +
                             " (Brussels). Sign in to BarberFlow to review it. The booking is NOT confirmed.")
        return {"id": bid, "state": "pending", "starts_at": start,
                "owner_notification_queued": queued,
                "message": "Request received; your appointment is NOT confirmed yet. The salon must contact you."}


    @app.get("/api/bookings/mail-status")
    def admin_mail_status(user=Depends(get_user)):
        with connect() as con:
            rows = con.execute("""SELECT state,COUNT(*) AS count FROM bf_mail_outbox
                WHERE salon_id=? GROUP BY state""", (user["salon_id"],)).fetchall()
            worker_running = worker_alive(con)
        return {"email_queue_enabled": config_ready(), "worker_running": worker_running,
                "states": [dict(r) for r in rows],
                "note": "smtp_accepted means accepted by the SMTP provider, not delivered to the inbox"}

    @app.get("/api/bookings")
    def admin_bookings(user=Depends(get_user)):
        with connect() as con:
            rows = con.execute("""SELECT b.id,b.customer_name,b.customer_email,b.customer_phone,
              b.starts_at,b.ends_at,b.state,b.created_at,s.name AS service_name
              FROM bf_bookings b JOIN bf_services s ON s.id=b.service_id
              WHERE b.salon_id=? ORDER BY b.starts_at DESC LIMIT 200""",
              (user["salon_id"],)).fetchall()
        return {"bookings": [dict(r) for r in rows], "auto_confirm": False,
                "email_queue_enabled": config_ready(), "worker_health_verified": False}

    @app.patch("/api/bookings/{booking_id}")
    def update_booking(booking_id: str, body: BookingState, user=Depends(get_user)):
        with connect() as con:
            con.execute("BEGIN IMMEDIATE")
            b = con.execute("SELECT * FROM bf_bookings WHERE id=? AND salon_id=?",
                            (booking_id, user["salon_id"])).fetchone()
            if not b:
                raise HTTPException(404, "Booking not found")
            if b["state"] in ("declined","cancelled"):
                raise HTTPException(409, "Closed bookings cannot be re-opened")
            if body.state == "confirmed":
                if b["state"] != "pending":
                    raise HTTPException(409, "Only pending requests may be confirmed")
                if datetime.strptime(b["starts_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                    raise HTTPException(409, "Cannot confirm a past appointment")
                service = con.execute("SELECT duration_minutes FROM bf_services WHERE id=? AND salon_id=?",
                                      (b["service_id"],user["salon_id"])).fetchone()
                valid_slot(con, user["salon_id"],
                           datetime.fromisoformat(b["starts_at"].replace("Z","+00:00")),
                           service["duration_minutes"])
                if conflict(con, user["salon_id"], b["starts_at"], b["ends_at"]):
                    raise HTTPException(409, "Conflicting confirmed appointment")
            result = con.execute("""UPDATE bf_bookings SET state=?, updated_at=? WHERE id=? AND salon_id=? RETURNING id,state""",
                                 (body.state, now(), booking_id, user["salon_id"])).fetchone()
            starts_local = datetime.fromisoformat(b["starts_at"].replace("Z","+00:00")).astimezone(ZONE).strftime("%d/%m/%Y %H:%M")
            if body.state == "confirmed":
                subject = "Appointment confirmed — " + user["salon"]
                content = "Your appointment on " + starts_local + " in Brussels is confirmed by " + user["salon"] + "."
            elif body.state == "cancelled":
                subject = "Appointment cancelled — " + user["salon"]
                content = "Your appointment on " + starts_local + " with " + user["salon"] + " was cancelled. Please contact the salon."
            else:
                subject = "Appointment request declined — " + user["salon"]
                content = "Your appointment request for " + starts_local + " could not be accepted. Please contact " + user["salon"] + "."
            queued = enqueue(con,user["salon_id"],booking_id,body.state,b["customer_email"],subject,content)
        return {**dict(result), "notification_queued": queued,
                "notifications_sent": False, "email_delivery": "outbox_pending" if queued else "manual_contact_required"}
