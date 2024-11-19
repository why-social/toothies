import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import uniqid from 'uniqid';
import Docker from 'dockerode';
import os from 'os';
import { Service } from './types/Service';

let containerName:string;
async function getContainerName(): Promise<string> {
    const docker = new Docker({ socketPath: '/var/run/docker.sock' });
    try {
        const containerId = os.hostname();
        const container = docker.getContainer(containerId);
        const data = await container.inspect();
        return data.Name.replace('/', ''); // Remove leading slash
    } catch (error) {
        console.error('Error fetching container name:', error);
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

const requestTopic = `request/${serviceId}`;
const responseTopic = `response/${serviceId}`;
const heartbeatTopic = 'heartbeat/topic';
const heartBeatInterval = 10000;

console.log(`Service ${serviceId} is running, connecting to MQTT broker...`);

mqttClient.on('connect', async () => {
	console.log('Connected to MQTT broker');

	containerName = await getContainerName();

	// Subscribe to request topic
	mqttClient.subscribe(requestTopic, (err) => {
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
	},heartBeatInterval);
});

mqttClient.on('message', (topic, message) => {	
	if (topic === requestTopic) {
		console.log(`Received request: ${message.toString()}`);

		const responseMessage = `Reply #${counter} to: "${message.toString()}" by service ${containerName}`;
		const options:IClientPublishOptions = {
			qos: 2
		}

		console.log(`Sent response: ${responseMessage}`);

		mqttClient.publish(responseTopic, responseMessage, options, (err) => {
			if (err) return console.error(`Failed to publish response message: ${err.message}`);
			counter++;
		});
	}
});