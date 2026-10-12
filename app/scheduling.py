"""Per-salon scheduling rules for the BarberFlow pilot, with Brussels timezone.

The database remains authoritative for availability and confirmations; never rely on
browser-side slot lists to assert an appointment is free.
"""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import re

from fastapi import HTTPException

ZONE = ZoneInfo("Europe/Brussels")


def utc_stamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def minutes(hhmm: str) -> int:
    if not isinstance(hhmm, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", hhmm):
        raise HTTPException(400, "Time must use HH:MM")
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def validate_hours(open_time, close_time, break_start, break_end, enabled):
    if not isinstance(enabled, bool):
        raise HTTPException(400, "Invalid opening state")
    opening, closing = minutes(open_time), minutes(close_time)
    if opening % 30 or closing % 30:
        raise HTTPException(400, "Opening hours must align to 30-minute slots")
    if closing <= opening:
        raise HTTPException(400, "Closing time must be after opening time")
    if (break_start is None) != (break_end is None):
        raise HTTPException(400, "Break needs both a start and end time")
    if break_start is not None:
        bstart, bend = minutes(break_start), minutes(break_end)
        if bstart % 30 or bend % 30 or not (opening <= bstart < bend <= closing):
            raise HTTPException(400, "Break must be fully inside working hours and aligned to 30 minutes")


def init_schedule(con):
    con.executescript("""
CREATE TABLE IF NOT EXISTS bf_work_hours (
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
    enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
    opens TEXT NOT NULL, closes TEXT NOT NULL,
    break_start TEXT, break_end TEXT,
    PRIMARY KEY(salon_id,weekday)
);
CREATE TABLE IF NOT EXISTS bf_closed_dates (
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    day TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(salon_id,day)
);
""")


def ensure_hours(con, salon_id):
    defaults = [(salon_id, day, int(day in (1, 2, 3, 4, 5)), "09:00", "18:00", None, None)
                for day in range(7)]
    con.executemany("""INSERT OR IGNORE INTO bf_work_hours
        (salon_id,weekday,enabled,opens,closes,break_start,break_end)
        VALUES(?,?,?,?,?,?,?)""", defaults)


def hours_for(con, salon_id):
    ensure_hours(con, salon_id)
    return [dict(r) for r in con.execute("""SELECT weekday,enabled,opens,closes,break_start,break_end
        FROM bf_work_hours WHERE salon_id=? ORDER BY weekday""", (salon_id,))]


def closure_for(con, salon_id, day: date) -> bool:
    return con.execute("SELECT 1 FROM bf_closed_dates WHERE salon_id=? AND day=?",
                       (salon_id, day.isoformat())).fetchone() is not None


def valid_slot(con, salon_id, raw: datetime, duration: int, *, enforce_horizon=True):
    if raw.tzinfo is None or raw.utcoffset() is None:
        raise HTTPException(400, "Appointment time requires an explicit timezone offset")
    local = raw.astimezone(ZONE)
    if local.second or local.microsecond or local.minute % 30:
        raise HTTPException(400, "Start at a full or half hour")
    if duration < 15 or duration > 180 or duration % 15:
        raise HTTPException(400, "Invalid service duration")
    utc = raw.astimezone(timezone.utc)
    if enforce_horizon:
        current = datetime.now(timezone.utc)
        if utc < current + timedelta(hours=2) or utc > current + timedelta(days=60):
            raise HTTPException(400, "Choose a time between 2 hours and 60 days ahead")
    ensure_hours(con, salon_id)
    row = con.execute("SELECT * FROM bf_work_hours WHERE salon_id=? AND weekday=?",
                      (salon_id, local.weekday())).fetchone()
    if not row or not row["enabled"] or closure_for(con, salon_id, local.date()):
        raise HTTPException(400, "Salon is closed on this date")
    start_minutes = local.hour * 60 + local.minute
    end_minutes = start_minutes + duration
    if start_minutes < minutes(row["opens"]) or end_minutes > minutes(row["closes"]):
        raise HTTPException(400, "Outside working hours")
    if row["break_start"] is not None and (
        start_minutes < minutes(row["break_end"]) and end_minutes > minutes(row["break_start"])
    ):
        raise HTTPException(400, "Appointment overlaps a scheduled break")
    return utc_stamp(utc), utc_stamp(utc + timedelta(minutes=duration))


def slots_for(con, salon_id, day: date, duration: int, conflict):
    ensure_hours(con, salon_id)
    row = con.execute("SELECT * FROM bf_work_hours WHERE salon_id=? AND weekday=?",
                      (salon_id, day.weekday())).fetchone()
    if not row or not row["enabled"] or closure_for(con, salon_id, day):
        return []
    start_min, end_min = minutes(row["opens"]), minutes(row["closes"])
    results = []
    for minute in range(start_min, end_min, 30):
        if minute + duration > end_min:
            break
        local = datetime.combine(day, time(hour=minute // 60, minute=minute % 60), tzinfo=ZONE)
        try:
            start, end = valid_slot(con, salon_id, local, duration)
        except HTTPException:
            continue
        if not conflict(con, salon_id, start, end):
            results.append({"starts_at": local.isoformat(), "label": local.strftime("%H:%M")})
    return results
