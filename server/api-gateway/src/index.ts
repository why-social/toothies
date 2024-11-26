import express, {Express, Request, Response, NextFunction} from 'express';
import cors from 'cors';
import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import { Service } from './types/Service';
import { ServicesList } from './types/ServicesList';

const app:Express = express();
const port:number = 3000;

const mqttOptions:IClientOptions = {
	username: "service",
	password: "Ilike2makewalks",
};

const requestTopic = 'request/';
const responseTopic = 'response/';
const heartbeatTopic = 'heartbeat/topic';

app.use(cors());

const mqttClient = mqtt.connect("tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883", mqttOptions);

let servicesList:ServicesList = new ServicesList(mqttClient);

mqttClient.on('error', (error) => {
	console.error('Mqtt error:', error);
	mqttClient.end();
});

mqttClient.on('connect', () => {
	console.log('Connected to MQTT broker');

	// Subscribe to heartbeat topic
	mqttClient.subscribe(heartbeatTopic, (err) => {
		if (err) return console.error('Failed to subscribe to heartbeat topic');

		console.log(`Subscribed to ${heartbeatTopic}`);
	});

	// Handle heartbeat messages, if a service is not in the list, add it
	mqttClient.on('message', (topic, message) => {
		if (topic === heartbeatTopic) {
			const msgService:Service = Service.fromJSON(message);
			const serviceId = msgService.getServiceId();
			const containerName = msgService.getContainerName();

			if (!servicesList.hasService(serviceId)) {
				servicesList.addService(msgService);
				mqttClient.subscribe(`response/${serviceId}`, (err) => {
					if (err) return console.error(`Failed to subscribe to response topic for service: ${containerName}`);
					console.log(`Added service: ${containerName}`);
				})
			}else{
				servicesList.updateHeartbeat(serviceId);
			}
		}
	})
});

app.use("/appointment", (req: Request, res: Response) => {
	const requestMessage = 'Request message';
	const options:IClientPublishOptions = { qos: 2 }
	const timeoutDuration = 3000;
	let retries = 0;
	const maxRetries = servicesList.getServicesCount();
	
	console.log("\n")

	const publishRequest = (serviceId: string) => {
        console.log(`Published request: ${requestMessage} to service ${serviceId}`);

		const messageHandler = (topic: string, message: Buffer) => {
			if (topic === responseTopic + serviceId) {
				clearTimeout(timeout);
				res.send(`Reply: ${message.toString()}`);
				mqttClient.removeListener('message', messageHandler);
				console.log(`Received response: ${message.toString()}\n`);
			}
		};

		mqttClient.on('message', messageHandler);

        mqttClient.publish(requestTopic + serviceId, requestMessage, options, (err) => {
            if (err) return res.status(500).send('Failed to publish request message');
        });

		const timeout = setTimeout(() => {
			console.log(`Request to service ${serviceId} timed out. Redirecting to another service...`);
			mqttClient.removeListener('message', messageHandler);
			retries++;
			if (retries < maxRetries) {
				const newServiceId = servicesList.getRoundRobinService()?.getServiceId();
				if (newServiceId) {
					publishRequest(newServiceId);
				} else {
					res.status(500).send('No available services to handle the request');
					console.log('No available services to handle the request\n');
				}
			} else {
				res.status(500).send('Request timed out after multiple retries');
				console.log('Request timed out after multiple retries\n');
			}
		}, timeoutDuration);
    };

	const initialServiceId = servicesList.getRoundRobinService()?.getServiceId();
    if (initialServiceId) {
        publishRequest(initialServiceId);
    } else {
        res.status(500).send('No available services to handle the request');
        console.log('No available services to handle the request\n');
    }
});

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
	console.log(`API Gateway listening at http://localhost:${port}`);
});