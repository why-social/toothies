import time
from random import randint
from datetime import datetime as date
from datetime import timedelta as delta
from locust import HttpUser, task, between, events
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from locust.runners import MasterRunner

MIN_HOUR = 8
MAX_HOUR = 20
STEP_MINUTES = 10
step = delta(minutes=STEP_MINUTES)
test_date = date(2025, 1, 1).replace(hour=MIN_HOUR)

def connect_db():
    uri = "mongodb+srv://locust:63Q8l2RKvr2iuMvn@cluster0.wft9l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
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

def generate_slots(db, id, y, m, d):
    test_date = date(y, m, d).replace(hour=MIN_HOUR)
    db["slots"].insert_many([
        {"doctorId": id, "startTime": test_date + i*step, "endTime": test_date + (i+1)*step}
        for i in range(0, (MAX_HOUR-MIN_HOUR)*60//STEP_MINUTES)
    ])

client = connect_db()
db = client['primary']
stressDoctorId = db["doctors"].insert_one({"name": "Stress Test"}).inserted_id
generate_slots(db, stressDoctorId, test_date.year, test_date.month, test_date.day)
time.sleep(1) # be nice to Atlas
client.close()

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    client = connect_db()
    db = client['primary']
    cleanup(db)

class BookingTests(HttpUser):
    wait_time = between(1, 5) # wait 1-5 secs between requests

    @task
    def create_booking(self):
        self.client.post("/appointments",
            json={'doctorId': str(stressDoctorId), 'startTime': str(test_date + delta(hours=randint(0, MAX_HOUR-MIN_HOUR)))}
        )

    @task
    def cancel_booking(self):
        self.client.delete("/appointments",
            json={'doctorId': str(stressDoctorId), 'startTime': str(test_date + delta(hours=randint(0, MAX_HOUR-MIN_HOUR)))}
        )


if __name__ == '__main__':
    client = connect_db()
    db = client['primary']
    stressDoctorId = db["doctors"].insert_one({"name": "Sven Svensson"}).inserted_id
    for i in range(1,30):
        generate_slots(db, stressDoctorId, 2025, 1, i)

    time.sleep(1)
    # cleanup(db)
    client.close()
