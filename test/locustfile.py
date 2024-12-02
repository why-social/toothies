import time
from random import randint
from datetime import datetime as date
from datetime import timedelta as delta
from locust import HttpUser, task, between
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

MIN_HOUR = 8
MAX_HOUR = 20
STEP_MINUTES = 10
testDate = date(2026, 1, 1).replace(hour=MIN_HOUR)
step = delta(minutes=STEP_MINUTES)

class BookingTests(HttpUser):
    wait_time = between(1, 5) # wait 1-5 secs between requests

    @task
    def create_booking(self):
        self.client.post("/appointments",
            json={'doctorId': str(self.stressDoctorId), 'startTime': str(testDate + delta(hours=randint(0, MAX_HOUR-MIN_HOUR)))}
        )

    @task
    def cancel_booking(self):
        self.client.delete("/appointments",
            json={'doctorId': str(self.stressDoctorId), 'startTime': str(testDate + delta(hours=randint(0, MAX_HOUR-MIN_HOUR)))}
        )

    def on_start(self):
        client = connect_db()
        db = client['primary']
        self.stressDoctorId = db["doctors"].insert_one({"name": "Stress Test"}).inserted_id
        generate_slots(db, self.stressDoctorId)
        time.sleep(1)
        client.close()

    def on_stop(self):
        client = connect_db()
        db = client['primary']
        cleanup(db)

def connect_db():
    uri = "mongodb+srv://nodejs:54AAuvmMv1osNAOz@cluster0.wft9l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    # Create a new client and connect to the server
    client = MongoClient(uri, server_api=ServerApi('1'))
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("Successfully connected to MongoDB!")

    return client

def cleanup(db):
    deleted_docs = 0
    deleted_slots = 0

    doctors = db["doctors"].find({"name": "Stress Test"}, {"_id": True})
    for doc in doctors:
        deleted_slots += db["slots"].delete_many({"doctorId": doc["_id"]}).deleted_count
        deleted_docs += db["doctors"].delete_one(doc).deleted_count
    print(f"Deleted {deleted_docs} doctors and {deleted_slots} slots")

def generate_slots(db, id):
    db["slots"].insert_many([
        {"doctorId": id, "startTime": testDate + i*step, "endTime": testDate + (i+1)*step}
        for i in range(0, (MAX_HOUR-MIN_HOUR)*60//STEP_MINUTES)
    ])

if __name__ == '__main__':
    client = connect_db()
    db = client['primary']
    stressDoctorId = db["doctors"].insert_one({"name": "Stress Test"}).inserted_id
    generate_slots(db, stressDoctorId)
    time.sleep(1)
    cleanup(db)
    client.close()
