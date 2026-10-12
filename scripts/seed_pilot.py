"""Create an isolated, clearly labeled salon DEMO account for a local beta.

Usage (from repository root):
    python -m scripts.seed_pilot --salon "Sample Barbershop" --base-url http://127.0.0.1:8000

This script does not contact real businesses, send messages, publish anything, or
create false bookings. Service prices are illustrative, never scraped or asserted
to be the named business's actual rates.
"""
import argparse
import os
import secrets
import sqlite3
import uuid

from app.main import connect, now, salted, uid


SAMPLE_SERVICES = (
    ("Haircut — sample price", 30, 2500),
    ("Haircut + beard — sample price", 45, 3500),
    ("Beard trim — sample price", 15, 1500),
)


def create_pilot(salon_label: str, *, owner_name: str = "Demo Operator") -> dict:
    """Make a local development-only salon. Credentials returned once to caller."""
    from app import main as application

    if application.ENV == "production" or os.getenv("APP_ENV", "development") == "production":
        raise RuntimeError("Refusing to create demo accounts in production")
    salon_label = " ".join(salon_label.strip().split())
    owner_name = " ".join(owner_name.strip().split())
    if not 2 <= len(salon_label) <= 55:
        raise ValueError("Salon label must be 2–55 characters")
    if not 2 <= len(owner_name) <= 65:
        raise ValueError("Owner label must be 2–65 characters")

    # Explicitly mark the sample to avoid impersonating real businesses.
    display_salon = "DEMO · " + salon_label
    token = uuid.uuid4().hex
    email = f"barberflow-demo-{token}@example.invalid"
    password = secrets.token_urlsafe(30)
    user_id, salon_id = uid(), uid()
    salt = secrets.token_hex(16)
    try:
        with connect() as con:
            con.execute(
                "INSERT INTO users(id,email,display_name,salt,password_hash,created_at) VALUES(?,?,?,?,?,?)",
                (user_id, email, owner_name, salt, salted(password, salt), now()),
            )
            con.execute(
                "INSERT INTO salons(id,owner_id,name,created_at) VALUES(?,?,?,?)",
                (salon_id, user_id, display_salon, now()),
            )
            con.executemany(
                """INSERT INTO bf_services
                   (id,salon_id,name,duration_minutes,price_cents,active,created_at)
                   VALUES(?,?,?,?,?,1,?)""",
                [(uid(), salon_id, name, mins, cents, now())
                 for name, mins, cents in SAMPLE_SERVICES],
            )
    except sqlite3.DatabaseError:
        raise
    return {
        "email": email,
        "password": password,
        "salon_id": salon_id,
        "salon": display_salon,
        "services": len(SAMPLE_SERVICES),
        "all_prices_are_samples": True,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Seed a clearly labeled local BarberFlow sample salon.")
    parser.add_argument("--salon", default="BarberFlow Pilot Brussels",
                        help="Short demo label, NOT proof of ownership or endorsement.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000",
                        help="Local test host used to construct links.")
    args = parser.parse_args(argv)
    base = args.base_url.rstrip("/")
    if not base.startswith("http://127.0.0.1:") and not base.startswith("http://localhost:"):
        parser.error("For safety, the preview URL must point to your local machine")
    demo = create_pilot(args.salon)
    print("\nBARBERFLOW LOCAL DEMO — NOT THE REAL BUSINESS")
    print("Salon:", demo["salon"])
    print("Login URL:", base + "/")
    print("Dashboard:", base + "/static/bookings.html")
    print("Customer request preview:", base + "/static/book.html?salon=" + demo["salon_id"] + "&lang=fr")
    print("Demo login email:", demo["email"])
    print("Demo password (shown only now):", demo["password"])
    print("Sample services and prices are placeholders. No customers or messages were created.")
    print("To start the application: uvicorn app.main:app --host 127.0.0.1 --port 8000\n")


if __name__ == "__main__":
    main()
