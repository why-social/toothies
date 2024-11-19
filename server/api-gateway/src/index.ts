import express, {Express, Request, Response, NextFunction} from 'express';
import httpProxy from 'http-proxy';
import cors from 'cors';
import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import { HeartbeatMessage } from './types/HeartbeatMessage';

const app:Express = express();
const port:number = 3000;
const serviceProxy:httpProxy = httpProxy.createProxyServer();

const localIp = "host.docker.internal";

let servicesAvailable:string[] = [];
let roundRobinIndex:number = 0;

const mqttOptions:IClientOptions = {
	username: "service",
	password: "Ilike2makewalks",
};

const requestTopic = 'request/';
const responseTopic = 'response/';
const heartbeatTopic = 'heartbeat/topic';
const servicesMap = new Map<string, number>();
const servicesNames:string[] = [];
const heartbeatInterval = 13000;

app.use(cors());

app.use("/proxy", (req: Request, res: Response) => {
	serviceProxy.web(req, res, {
		target: `http://${localIp}:3001/proxy`,
		changeOrigin: true,
		secure: true,
		xfwd: true
	}, (err) => {
		if(err) {
			console.error(err);
			res.status(500).send('Failed to proxy request');
		}
	});
});

const mqttClient = mqtt.connect("tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883", mqttOptions);

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

	// Handle heartbeat messages
	mqttClient.on('message', (topic, message) => {
		if (topic === heartbeatTopic) {
			const msg = new HeartbeatMessage(message);
			const serviceId = msg.getServiceId();
			const containerName = msg.getContainerName();
			const currentTime = Date.now();
			servicesMap.set(serviceId, currentTime);

			if (!servicesAvailable.includes(serviceId)) {
				servicesAvailable.push(serviceId);
				servicesNames.push(containerName);
				mqttClient.subscribe(`response/${serviceId}`, (err) => {
					if (err) return console.error(`Failed to subscribe to response topic for service: ${containerName}`);
					console.log(`Added service: ${containerName}`);
				})
			}
		}
	})
});

// Check and remove dead services
setInterval(() => {
    const currentTime = Date.now();
    for (const [serviceId, lastHeartbeat] of servicesMap.entries()) {
        if (currentTime - lastHeartbeat > heartbeatInterval) { // if service has not sent a heartbeat in the last 5 seconds
            servicesMap.delete(serviceId);
            const index = servicesAvailable.indexOf(serviceId);
            if (index !== -1) {
                servicesAvailable.splice(index, 1);
				let containerName = servicesNames[index];
				servicesNames.splice(index, 1);
				mqttClient.unsubscribe(`response/${serviceId}`, (err) => {
					if (err) return console.error(`Failed to unsubscribe from response topic for service: ${containerName}`);
					console.log(`Removed service due to inactivity: ${containerName}`);
				})
            }
        }
    }
}, heartbeatInterval);

app.use("/mqtt", (req: Request, res: Response) => {
	const requestMessage = 'Request message';
	const mqttServiceTopic = getNextMqttTopic();

	const options:IClientPublishOptions = {
		qos: 2
	}

	console.log(`\nPublished request: ${requestMessage}`);

	mqttClient.publish(requestTopic + mqttServiceTopic, requestMessage, options, (err) => {
		if (err) {
			res.status(500).send('Failed to publish request message');
			return;
		}

		const messageHandler = (topic: string, message: Buffer) => {
			if (topic === responseTopic + mqttServiceTopic) {
				res.send(`Reply: ${message.toString()}`);
				mqttClient.removeListener('message', messageHandler);
				console.log(`Received response: ${message.toString()}\n`);
			}
		};
		
		mqttClient.on('message', messageHandler);

		// TODO: Add timeout (e.g. 5 seconds) to handle cases where the service does not respond
	});
});

function getNextMqttTopic():string {
	const topic = servicesAvailable[roundRobinIndex];
	roundRobinIndex = (roundRobinIndex + 1) % servicesAvailable.length;
	return topic;
}

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
	console.log(`API Gateway listening at http://localhost:${port}`);
});