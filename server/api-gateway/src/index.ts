import express, {Express, Request, Response, NextFunction} from 'express';
import httpProxy from 'http-proxy';
import cors from 'cors';
import mqtt, {IClientOptions, IClientPublishOptions} from 'mqtt';
import { Service } from './types/Service';
import { ServicesList } from './types/ServicesList';

const app:Express = express();
const port:number = 3000;
const serviceProxy:httpProxy = httpProxy.createProxyServer();

const localIp = "host.docker.internal";

const mqttOptions:IClientOptions = {
	username: "service",
	password: "Ilike2makewalks",
};

const requestTopic = 'request/';
const responseTopic = 'response/';
const heartbeatTopic = 'heartbeat/topic';

app.use(cors());

app.use("/proxy", (req: Request, res: Response) => {

	// Add header to measure time taken to proxy request
	let timeBeforeReq:number = Date.now();
	req.headers['x-time-before-req'] = timeBeforeReq.toString();

	// Proxy request to proxy-service
	console.log('\nProxying request');
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



app.use("/mqtt", (req: Request, res: Response) => {
	const requestMessage = 'Request message';
	const mqttServiceTopic = servicesList.getRoundRobinService()?.getServiceId();
	let timeBeforeReq:number = Date.now();
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
				clearTimeout(timeout);
				let timeAfterReq:number = Date.now();
				let timeDiff:number = timeAfterReq - timeBeforeReq;
				res.send(`Reply: ${message.toString()}<br>Time taken: ${timeDiff}ms`);
				mqttClient.removeListener('message', messageHandler);
				console.log(`Received response: ${message.toString()}\n`);
			}
		};

		const timeoutDuration = 3000; // Timeout duration in milliseconds
        const timeout = setTimeout(() => {
			console.log(`Request to service ${mqttServiceTopic} timed out. Redirecting to another service...`);
            mqttClient.removeListener('message', messageHandler);
            const newServiceId = servicesList.getRoundRobinService()?.getServiceId();
            if (newServiceId) {
                // Republish the request to the a service
                mqttClient.publish(requestTopic + newServiceId, requestMessage, options, (err) => {
                    if (err) {
                        res.status(500).send('Failed to publish request message to new service');
                        return;
                    }
                    // Set up a new message handler for the new service
                    const newMessageHandler = (topic: string, message: Buffer) => {
                        if (topic === responseTopic + newServiceId) {
                            let timeAfterReq:number = Date.now();
                            let timeDiff:number = timeAfterReq - timeBeforeReq;
                            res.send(`Reply: ${message.toString()}<br>Time taken: ${timeDiff}ms`);
                            mqttClient.removeListener('message', newMessageHandler);
                            console.log(`Received response from new service: ${message.toString()}\n`);
                        }
                    };
                    mqttClient.on('message', newMessageHandler);
                });
            } else {
                res.status(500).send('No available services to handle the request');
				console.log('No available services to handle the request\n');
            }
        }, timeoutDuration);
		
		mqttClient.on('message', messageHandler);

		// TODO: Add request timeout
	});
});

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
	console.log(`API Gateway listening at http://localhost:${port}`);
});