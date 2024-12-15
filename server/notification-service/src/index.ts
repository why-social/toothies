import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { sendEmail } from "./utils/sendEmail";

dotenv.config();
if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
}
if (!process.env.MQTT_USERNAME) {
  throw new Error("MQTT_USERNAME is not defined");
}
if (!process.env.MQTT_PASSWORD) {
  throw new Error("MQTT_PASSWORD is not defined");
}

const atlasClient = new MongoClient(process.env.ATLAS_CONN_STR);
const db = atlasClient.db("primary");
const users = db.collection("users");
const doctors = db.collection("doctors");

// Notify a doctor via email
// Topic: notifications/doctor
// Message format:
// { reqId: <number>, timestamp: <number>,
//   data: { userId: <string>, emailMessage: {subject: <string>, text: <string>, html: <string>} }
// }
const notifyDoctor = async (message: Buffer) => {
  let data, reqId, timestamp;
  try {
    const payload = JSON.parse(message.toString());
    data = payload.data;
    reqId = payload.timestamp;
    timestamp = payload.timestamp;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    console.log(`Malformed request: ${message}`);
    return;
  }

  if (!data || !timestamp) {
    console.error(`Malformed request: ${message}`);
    return;
  }
  if (
    !data.emailMessage ||
    !data.emailMessage.subject ||
    !data.emailMessage.text ||
    !data.emailMessage.html
  ) {
    console.error(`Missing required fields in request: ${message}`);
    return;
  }

  const doctor = await doctors.findOne({
    _id: new ObjectId(data.userId),
  });

  if (!doctor) {
    console.error(`Doctor not found: ${message}`);
    return;
  }

  if (!doctor.email) {
    console.log(`Doctor ${doctor.name} does not have an email address`);
    return;
  }

  // Send email
  try {
    await sendEmail(
      doctor.email,
      doctor.name,
      data.emailMessage.subject,
      data.emailMessage.text,
      data.emailMessage.html,
    );
    console.log(
      `Email sent to doctor: ${doctor.email}\nEmail text: ${data.emailMessage.text}`,
    );
  } catch (e) {
    console.error(`Failed to send email to doctor: ${doctor.email}`);
  }
};

//-------------------- DEFINE BROKER --------------------
const broker: ServiceBroker = new ServiceBroker(
  "notifications",
  String(process.env.BROKER_ADDR),
  {
    username: String(process.env.MQTT_USERNAME),
    password: String(process.env.MQTT_PASSWORD),
  },
  {
    onFailed() {
      process.exit(0);
    },
    onConnected() {
      // TODO: topics must include serviceId
      //serviceId/notifications/login
      broker.subscribe("doctor", notifyDoctor);
      //broker.subcscribe("user", notifyUser);
    },
  },
);
