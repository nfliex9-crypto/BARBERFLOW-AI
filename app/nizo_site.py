"""NIZO Ghent branded public preview and opt-in owner onboarding.

The landing page never claims to be the official business site unless the salon owner
has explicitly published it from an authenticated account. This module does not
scrape or store Google's pictures, reviews, or customer information.
"""
import hmac
import os
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


class SetupRequest(BaseModel):
    setup_code: str = Field(min_length=16, max_length=256)
    email: str = Field(min_length=6, max_length=200)
    password: str = Field(min_length=12, max_length=128)
    owner_name: str = Field(min_length=2, max_length=65)


class PublishApproval(BaseModel):
    business_permission: bool
    services_checked: bool
    opening_hours_checked: bool
    privacy_notice_checked: bool
    enable: bool


DEFAULT_NAMES = (
    ("Herenknipbeurt", 30),
    ("Knippen + baard", 45),
    ("Baard bijwerken", 30),
)

# Opening hours confirmed by the BARBER NIZO project contact.
# weekday: Monday=0 through Sunday=6. Staff breaks remain owner-managed.
CONFIRMED_PUBLIC_HOURS = [
    {"weekday": day, "enabled": int(day != 6), "opens": "10:00", "closes": "20:00"}
    for day in range(7)
]


def install_nizo(app, connect, get_user, throttle, uid, now, salted, login_cookie, root):
    with connect() as con:
        con.executescript("""
CREATE TABLE IF NOT EXISTS bf_nizo_site(
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  salon_id TEXT NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
""")

    def site_row(con):
        return con.execute("""SELECT n.salon_id,n.published,s.name
            FROM bf_nizo_site n JOIN salons s ON s.id=n.salon_id WHERE n.singleton=1""").fetchone()

    @app.get("/nizo", include_in_schema=False)
    @app.get("/nizo/", include_in_schema=False)
    def nizo_home():
        return FileResponse(root/"app"/"static"/"nizo.html")

    @app.get("/nizo/setup", include_in_schema=False)
    def nizo_owner_setup():
        return FileResponse(root/"app"/"static"/"nizo-setup.html")

    @app.get("/nizo/privacy", include_in_schema=False)
    def nizo_privacy():
        return FileResponse(root/"app"/"static"/"nizo-privacy.html")

    @app.get("/api/nizo/site")
    def nizo_public_site():
        with connect() as con:
            salon=site_row(con)
            if not salon:
                return {"configured":False,"published":False,"booking_enabled":False,
                        "salon_id":None,"services":[],"hours":CONFIRMED_PUBLIC_HOURS,
                        "note":"Website preview only. Online appointment requests not active."}
            services=con.execute("""SELECT id,name,duration_minutes,price_cents
                FROM bf_services WHERE salon_id=? AND active=1 ORDER BY created_at""",
                (salon["salon_id"],)).fetchall()
            hours=con.execute("""SELECT weekday,enabled,opens,closes FROM bf_work_hours
                WHERE salon_id=? ORDER BY weekday""",(salon["salon_id"],)).fetchall()
        live=bool(salon["published"])
        return {"configured":True,"published":live,"booking_enabled":live,
                "salon_id":salon["salon_id"] if live else None,
                "services":[dict(s) for s in services],"hours":[dict(h) for h in hours],
                "note":("Appointments are REQUESTS until salon confirmation."
                    if live else "PREVIEW ONLY: not an official booking site.")}

    @app.get("/api/nizo/admin")
    def nizo_admin(user=Depends(get_user)):
        with connect() as con:
            row=site_row(con)
        if not row or row["salon_id"]!=user["salon_id"]:
            raise HTTPException(403,"You are not the owner of the NIZO site")
        return {"published":bool(row["published"]), "site":"/nizo",
                "management":"/static/bookings.html"}

    @app.post("/api/nizo/setup", status_code=201)
    def create_owner(body:SetupRequest,response:Response,request:Request):
        throttle(request,"nizo-onetime-setup",4,3600)
        correct=os.getenv("BF_NIZO_SETUP_CODE","")
        if len(correct)<32 or not hmac.compare_digest(body.setup_code,correct):
            raise HTTPException(403,"Invalid setup code")
        email=body.email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+",email):
            raise HTTPException(400,"Invalid email")
        name=body.owner_name.strip()
        if len(name)<2:
            raise HTTPException(400,"Invalid owner name")
        user_id,salon_id=uid(),uid()
        salt=secrets.token_hex(16)
        from .scheduling import ensure_hours
        try:
            with connect() as con:
                con.execute("BEGIN IMMEDIATE")
                if site_row(con):
                    raise HTTPException(409,"NIZO already has an owner; sign in instead")
                con.execute("""INSERT INTO users
                  (id,email,display_name,salt,password_hash,created_at)
                  VALUES(?,?,?,?,?,?)""",
                  (user_id,email,name,salt,salted(body.password,salt),now()))
                con.execute("""INSERT INTO salons(id,owner_id,name,created_at)
                  VALUES(?,?,?,?)""",(salon_id,user_id,"BARBER NIZO · Gent",now()))
                # These are service CATEGORIES and sample durations, NOT actual prices.
                con.executemany("""INSERT INTO bf_services
                  (id,salon_id,name,duration_minutes,price_cents,active,created_at)
                  VALUES(?,?,?,?,?,1,?)""",
                  [(uid(),salon_id,title,minutes,0,now()) for title,minutes in DEFAULT_NAMES])
                ensure_hours(con,salon_id)
                # Tentative schedule only, owner must verify before enabling bookings.
                for day in CONFIRMED_PUBLIC_HOURS:
                    con.execute("""UPDATE bf_work_hours
                      SET enabled=?,opens=?,closes=? WHERE salon_id=? AND weekday=?""",
                      (day["enabled"], day["opens"], day["closes"], salon_id, day["weekday"]))
                con.execute("""INSERT INTO bf_nizo_site(singleton,salon_id,published,created_at)
                     VALUES(1,?,0,?)""",(salon_id,now()))
        except sqlite3.IntegrityError:
            raise HTTPException(409,"Email already in use")
        login_cookie(response,user_id)
        return {"created":True,"published":False,"dashboard":"/static/bookings.html",
                "note":"Review real services, prices, hours and privacy before publishing."}

    @app.post("/api/nizo/publish")
    def publish_nizo(body:PublishApproval,user=Depends(get_user)):
        with connect() as con:
            con.execute("BEGIN IMMEDIATE")
            row=site_row(con)
            if not row or row["salon_id"]!=user["salon_id"]:
                raise HTTPException(403,"Not permitted to publish this business")
            if body.enable:
                if not all((body.business_permission,body.services_checked,
                            body.opening_hours_checked,body.privacy_notice_checked)):
                    raise HTTPException(400,"Owner must approve all launch checks")
                count=con.execute("""SELECT COUNT(*) FROM bf_services WHERE salon_id=?
                    AND active=1""",(user["salon_id"],)).fetchone()[0]
                if count==0:
                    raise HTTPException(409,"Add at least one service before publishing")
            con.execute("UPDATE bf_nizo_site SET published=? WHERE singleton=1",
                        (int(body.enable),))
        return {"published":body.enable,
                "notice":"Publishing activates booking requests, which still need manual owner confirmation."}
