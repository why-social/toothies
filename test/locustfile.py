import time
from random import randint
from datetime import datetime as date
from datetime import timedelta as delta
from locust import HttpUser, task, between, events
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os

load_dotenv()

MIN_HOUR = 8
MAX_HOUR = 20
STEP_MINUTES = 10
step = delta(minutes=STEP_MINUTES)
test_date = date(2025, 1, 1).replace(hour=MIN_HOUR)

if os.getenv("ATLAS_CONN_STR") is None:
    raise Exception("ATLAS_CONN_STR environment variable not set")

class BookingTests(HttpUser):
    wait_time = between(1, 5) # wait 1-5 secs between requests

    db_conn = None
    doctor_id = None
    free_slots = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.pn = None
        self.booked_slots = []  # Track booked slots for this user

    @staticmethod
    def connect_db():
        uri = os.getenv("ATLAS_CONN_STR")
        # Create a new client and connect to the server
        client = MongoClient(uri, server_api=ServerApi('1'), maxPoolSize=5, minPoolSize=1)
        # Send a ping to confirm a successful connection
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")

        return client

    @staticmethod
    def generate_slots(db, id, y, m):
        print(f"Generating slots for {y}-{m}...")
        slots = []
        for i in range(30):
            start = date(y, m, i+1).replace(hour=MIN_HOUR)
            slots += [start + j*step for j in range(0, (MAX_HOUR-MIN_HOUR)*60//STEP_MINUTES)]

        inserted = db["slots"].insert_many([
            {"doctorId": id, "startTime": slot, "endTime": slot + step}
            for slot in slots
        ]).inserted_ids

        BookingTests.free_slots += slots
        print(f"Generated {len(BookingTests.free_slots)} slots (inserted {len(inserted)})")

    def generate_pn(self):
        # generate pseudo personnummer (random 10 digit number)
        self.pn = ''.join(str(randint(0, 9)) for _ in range(10))
        return self.pn

    @events.test_start.add_listener
    def on_test_start(environment, **kwargs):
        # create a test doctor and slots for all test users
        BookingTests.db_conn = BookingTests.connect_db()
        db = BookingTests.db_conn['primary']

        clinic_id = db["clinics"].aggregate([{ '$sample': { 'size': 1 } }]).next()["_id"]
        print("CLINIC ID"+str(clinic_id))
        doctor = {
            "name": "STRESS TEST",
            "email": "locust@test.gg",
            "clinic": clinic_id,
            "type": "TEST"
        }

        BookingTests.doctor_id = db['doctors'].insert_one(doctor).inserted_id
        BookingTests.generate_slots(db, BookingTests.doctor_id, test_date.year, test_date.month)
        time.sleep(1) # be nice to Atlas

    @events.test_stop.add_listener
    def on_test_stop(environment, **kwargs):
        if BookingTests.db_conn and BookingTests.doctor_id:
            db = BookingTests.db_conn['primary']

            deleted_slots = db["slots"].delete_many({"doctorId": BookingTests.doctor_id}).deleted_count
            deleted_docs = db["doctors"].delete_one({"_id": BookingTests.doctor_id}).deleted_count
            print(f"Deleted {deleted_docs} doctor ({BookingTests.doctor_id}) and {deleted_slots} slots")
            BookingTests.db_conn.close()
            print("Closed DB connection")
        elif BookingTests.db_conn:
            print("No doctor ID found")
            BookingTests.db_conn.close()
        else:
            print("No DB connection")

    def on_start(self):
        user_data = {
            "personnummer": self.generate_pn(),
            "passwordHash": "A$$w0rd!",
            "email": "test@locust.gg",
            "name": "STRESS TEST"
        }
        res = self.client.post("/auth/register", json=user_data)
        self.token = res.json()["token"]

    def on_stop(self):
        if BookingTests.db_conn and self.pn:
            deleted = BookingTests.db_conn['primary']['users'].delete_one({"personnummer": self.pn}).deleted_count
            print(f"Deleted {deleted} user ({self.pn})")
        elif BookingTests.db_conn:
            print("No personnummer found")
        else:
            print("No DB connection")

    @task
    def create_booking(self):
        # Try to book a random slot
        if BookingTests.doctor_id and BookingTests.free_slots:
            date = BookingTests.free_slots.pop(randint(0, len(BookingTests.free_slots)-1))
            headers = {"Authorization": f"Bearer {self.token}"}
            body = {
                'doctorId': str(BookingTests.doctor_id),
                'startTime': date.isoformat()
            }
            res = self.client.post("/appointments",
                headers=headers,
                json=body
            )
            if res.json().get("message") == "Slot successfully booked": # TODO: status code
                self.booked_slots.append(date)
            else:
                BookingTests.free_slots.append(date)

        elif BookingTests.doctor_id:
            print("No free slots")
        else:
            print("No doctor ID found")

    @task
    def cancel_booking(self):
        # Try to cancel one of the booked slots
        if self.booked_slots and BookingTests.doctor_id:
            date = self.booked_slots.pop(randint(0, len(self.booked_slots)-1))
            print(date)
            headers = {"Authorization": f"Bearer {self.token}"}
            body = {
                'doctorId': str(BookingTests.doctor_id),
                'startTime': date.isoformat()
            }
            self.client.delete("/appointments",
                headers=headers,
                json=body
            )
            BookingTests.free_slots.append(date)
        elif self.booked_slots:
            print("No doctor ID found")
        else:
            print("No booked slots")
