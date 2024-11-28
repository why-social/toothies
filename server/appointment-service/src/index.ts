import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import uniqid from 'uniqid';
import Docker from 'dockerode';
import os from 'os';
import dotenv from 'dotenv';
import { Service } from './types/Service';
import { MongoClient, ObjectId } from 'mongodb';

interface Query {
  action: string;
  doctorId: ObjectId;
  startTime: Date;
}

dotenv.config();

if (!process.env.ATLAS_CONN_STR) {
  throw new Error('ATLAS_CONN_STR is not defined');
}
const atlasClient = new MongoClient(process.env.ATLAS_CONN_STR);
const db = atlasClient.db('primary');
const slots = db.collection('slots');

let containerName:string;
async function getContainerName(): Promise<string> {
  if(process.env.CONTAINER_NAME) return process.env.CONTAINER_NAME;

  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  try {
    const containerId = os.hostname();
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return data.Name.replace('/', ''); // Remove leading slash
  } catch (error) {
    console.error('Could not get container name, name will be set to unknown');
    return 'unknown';
  }
}

let counter:number = 1;

const serviceId:string = uniqid();

const mqttOptions:IClientOptions = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const mqttClient = mqtt.connect("tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883", mqttOptions);

const requestTopic = (process.env.TEST_TOPIC) ? `appointments/test` : `appointments/${serviceId}`;
const heartbeatTopic = 'heartbeat/appointments';
const heartBeatInterval = 10000;

console.log(`Service ${serviceId} is running, connecting to MQTT broker...`);

mqttClient.on('connect', async () => {
  console.log('Connected to MQTT broker');

  containerName = await getContainerName();

  // Subscribe to request topic
  mqttClient.subscribe(requestTopic + '/#', (err) => {
    if (err) return console.error('Failed to subscribe to request topic');

    console.log(`Subscribed to ${requestTopic}`);
  });

  // Heartbeat
  setInterval(() => {
    const serviceMsg = new Service(serviceId, containerName).toString();
    const message = `${serviceMsg}`;
    mqttClient.publish(heartbeatTopic, message, (err) => {
      if (err) return console.error(`Failed to publish message: ${err.message}`);
    });
  }, heartBeatInterval);
});

/** 
  * Message Format:
  *   Topic: appointments/<instance>/<action>
  *     where instance is id of the service instance, action is 'book' or 'cancel'
  *   Message: { "doctorId": <ObjectId>, "startTime": <Date> }
  */ 
mqttClient.on('message', async (topic, message) => {	
  console.log(`Received request: ${message.toString()}`); // DEBUG
  
  // correct topic is matched, action put into capture group 1 (params[1]), params[0] is the whole match
  const params = /^appointments\/\w+\/(\w+)$/g.exec(topic); 
  if (!params) {
    console.error("Invalid topic");
    return;
  }

  const payload: Query = JSON.parse(message.toString());
  const query = {
    action : params[1],
    doctorId : new ObjectId(payload.doctorId),
    startTime : new Date(payload.startTime)
  }

  if (!query.action || !query.doctorId || !query.startTime) {
    console.error("Invalid query:");
    console.log(query);
    return;
  }

  // handle request
  switch (query.action) {
    case 'book': // book a slot
      let slot = await slots.findOne({ doctorId: query.doctorId, startTime: query.startTime });
      if (!slot) {
        console.error("Slot does not exist");
        console.log(query);
        return;
      }

      if (slot.isBooked) {
        console.error("Slot already booked");
        console.log(query);
        console.log(slot);
        return;
      }

      await slots.updateOne({ _id: slot._id }, { $set: { isBooked: true } });
      console.log(`Slot successfully booked: ${query.startTime}`);
      break;

    case 'cancel': // cancel a slot
      //TODO
      break;

    default:
      console.error("Invalid action");
      return;
  }
});

// TODO: close connections