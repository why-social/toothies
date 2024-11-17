import express, {Express, Request, Response, NextFunction} from 'express';
import httpProxy from 'http-proxy';
import cors from 'cors';
import mqtt from 'mqtt';

const app:Express = express();
const port:number = 3000;
const serviceProxy:httpProxy = httpProxy.createProxyServer();

const localIp = "host.docker.internal";

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

const mqttOptions = {
	host: 'broker.hivemq.com',
	port: 1883,
	clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
};

const mqttClient = mqtt.connect(mqttOptions);

const requestTopic = 'request/topic';
const responseTopic = 'response/topic';

mqttClient.on('connect', () => {
	console.log('Connected to MQTT broker');

	mqttClient.subscribe(responseTopic, (err) => {
	if (err) {
		console.error('Failed to subscribe to request topic');
		return;
	}

	console.log(`Subscribed to ${responseTopic}`);
	});
});

app.use("/mqtt", (req: Request, res: Response) => {
	const requestMessage = 'Request message';

	mqttClient.publish(requestTopic, requestMessage, (err) => {
		if (err) {
			res.status(500).send('Failed to publish request message');
			return;
		}

		console.log(`Published request: ${requestMessage}`);

		const messageHandler = (topic: string, message: Buffer) => {
			if (topic === responseTopic) {
				res.send(`Received reply: ${message.toString()}`);
				mqttClient.removeListener('message', messageHandler);
			}
		};
		
		mqttClient.on('message', messageHandler);
	});
});

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});