import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import uniqid from 'uniqid';
import Docker from 'dockerode';
import os from 'os';
import dotenv from 'dotenv';
import { Service } from './types/Service';

dotenv.config();

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
	username: "service",
	password: "Ilike2makewalks",
};

const mqttClient = mqtt.connect("tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883", mqttOptions);

const requestTopic = `appointments/${serviceId}`;
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

mqttClient.on('message', (topic, message) => {	
	if (topic.startsWith(requestTopic)) { 
		console.log(`Received request: ${message.toString()}`);
    const doctorId = /^appointments\/\w+\/(\w+)$/g.exec(topic);
    if (!doctorId) {
      console.error("No doctor Id");
      return;
    }
    console.log(`Doctor ID: ${doctorId[1]}`);
    
	}
  
});
