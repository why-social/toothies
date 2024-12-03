import mqtt, { IClientOptions, IClientPublishOptions } from "mqtt";
import uniqid from "uniqid";
import Docker from "dockerode";
import os from "os";
import dotenv from "dotenv";
import { Service } from "./types/Service";
import { MongoClient, ObjectId } from "mongodb";

interface Query {
  timestamp: Number;
  action: string;
  doctorId?: ObjectId;
  startTime?: Date;
}

dotenv.config();

if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
}
const atlasClient = new MongoClient(process.env.ATLAS_CONN_STR);
const db = atlasClient.db("primary");
const slots = db.collection("slots");
const doctors = db.collection("doctors");

let containerName: string;
async function getContainerName(): Promise<string> {
  if (process.env.CONTAINER_NAME) return process.env.CONTAINER_NAME;

  const docker = new Docker({ socketPath: "/var/run/docker.sock" });
  try {
    const containerId = os.hostname();
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return data.Name.replace("/", ""); // Remove leading slash
  } catch (error) {
    console.error("Could not get container name, name will be set to unknown");
    return "unknown";
  }
}

let counter: number = 1;

const mqttOptions: IClientOptions = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const mqttClient = mqtt.connect(
  "tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883",
  mqttOptions,
);

const serviceId: string = process.env.TEST_TOPIC ? `test` : uniqid();
const heartbeatTopic = "heartbeat/appointments";
const heartBeatInterval = 10000;

console.log(`Service ${serviceId} is running, connecting to MQTT broker...`);

mqttClient.on("connect", async () => {
  console.log("Connected to MQTT broker");

  containerName = await getContainerName();

  // Subscribe to request topics
  mqttClient.subscribe(serviceId + "/appointments/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to appoinments/#`);
  });
  mqttClient.subscribe(serviceId + "/doctors/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to doctors/#`);
  });

  // Heartbeat
  setInterval(() => {
    const serviceMsg = new Service(serviceId, containerName).toString();
    const message = `${serviceMsg}`;
    mqttClient.publish(heartbeatTopic, message, (err) => {
      if (err)
        return console.error(`Failed to publish message: ${err.message}`);
    });
  }, heartBeatInterval);
});

/**
 * Appointment endpoints:
 *   Topic: <instance>/appointments/<action>
 *     where instance is id of the service instance, action is 'get', 'book' or 'cancel'
 *   Message: { "timestamp": <long>, doctorId": <ObjectId>, "startTime": <Date> }
 * Response Format (to the API gateway):
 *   Topic: <instance>/appointments/res
 *   Message: { "timestamp": <long>, "message": <string>}
 * Notification Format (to the client):
 *   Topic: appointments/<doctorId>
 *   Message: { "startTime": <Date>, "isBooked": <bool> }
 */

/**
 * Appointment endpoints:
 *   Topic: doctors/<instance>/<action>
 *     where instance is id of the service instance, action is 'get' or '
 */
mqttClient.on("message", async (topic, message) => {
  console.log(`Received request [${topic}]:${message.toString()}`); // DEBUG

  // correct topic is matched,
  // endpoint put into capture group 1 (params[1]),
  // action punt into capture group 2 (params[2])
  // params[0] is the whole match
  const params = /^\w+\/(\w+)\/(\w+)$/g.exec(topic);
  if (params?.length != 3) {
    console.error(
      "Invalid topic. Expected format: <instanceId>/<endpoint>/<action>",
    );
    return;
  }
  const payload = JSON.parse(message.toString());
  const query: Query = {
    timestamp: payload.timestamp,
    action: params[2],
    ...(payload.doctorId && { doctorId: new ObjectId(payload.doctorId) }),
    ...(payload.startTime && { startTime: new Date(payload.startTime) }),
  };
  // handle requests
  switch (params[1]) {
    case "appointments": {
      if (
        !query.action ||
        !query.doctorId ||
        (query.action != "get" && !query.startTime)
      ) {
        console.error("Invalid query:");
        console.log(query);
        break;
      }

      await handleAppointmentsRequest(query);
      break;
    }

    case "doctors": {
      switch (params[2]) {
        case "get":
          await getAllDoctors(query);
          break;
      }
      break;
    }
  }
});

// TODO: explicitly close connections

async function handleAppointmentsRequest(query: Query) {
  const responseTopic = `${serviceId}/res/${query.timestamp}`;
  let slot;

  switch (query.action) {
    case "get":
      let doctorSlots = await slots
        .find({ doctorId: query.doctorId })
        .toArray();
      console.log(doctorSlots);
      mqttClient.publish(responseTopic, JSON.stringify(doctorSlots));
      console.log("Published ", doctorSlots);
      break;

    case "book": // book a slot
      slot = await slots.findOne({
        doctorId: query.doctorId,
        startTime: query.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: query.timestamp,
            message: "Error: Slot does not exist",
          }),
        );
        return;
      }
      if (slot.isBooked) {
        console.error("Slot already booked");
        console.log(query);
        console.log(slot);
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: query.timestamp,
            message: "Error: Slot already booked",
          }),
        );
        return;
      }

      slot.isBooked = true;
      await slots.updateOne({ _id: slot._id }, { $set: { isBooked: true } });
      mqttClient.publish(
        responseTopic,
        JSON.stringify({
          timestamp: query.timestamp,
          message: "Slot successfully booked",
        }),
      );
      mqttClient.publish(
        `appointments/${query.doctorId}`,
        JSON.stringify(slot),
      );
      console.log(`Slot successfully booked: ${query.startTime}`);
      break;

    case "cancel": // cancel a slot
      slot = await slots.findOne({
        doctorId: query.doctorId,
        startTime: query.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: query.timestamp,
            message: "Error: Slot does not exist",
          }),
        );
        return;
      }
      if (!slot.isBooked) {
        console.error("Slot not booked");
        console.log(query);
        console.log(slot);
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: query.timestamp,
            message: "Error: Cannot cancel a non-booked slot",
          }),
        );
        return;
      }

      slot.isBooked = false;
      await slots.updateOne({ _id: slot._id }, { $set: { isBooked: false } });
      mqttClient.publish(
        responseTopic,
        JSON.stringify({
          message: "Booking successfully cancelled",
        }),
      );
      mqttClient.publish(
        `appointments/${query.doctorId}`,
        JSON.stringify(slot),
      );
      console.log(`Booking successfully cancelled: ${query.startTime}`);
      break;

    default:
      console.error("Invalid action");
      return;
  }
}

async function getAllDoctors(query: Query) {
  const responseTopic = `${serviceId}/res/${query.timestamp}`;
  let allDoctors = await doctors.find().toArray();
  mqttClient.publish(responseTopic, JSON.stringify(allDoctors));
}
