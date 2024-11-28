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

const requestTopic = 'appointments/';
const responseTopic = 'response/';
const heartbeatTopic = 'heartbeat/appointments'; // TODO: general topics

app.use(cors());
// Parse requests of content-type 'application/json'
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

/**
 * Format: 
 *   Endpoint: /appointment
 * 	 Body: { doctorId: <ObjectId>, startTime: <Date> }
 */
// TODO: Auth
app.post("/appointment", (req: Request, res: Response) => {
	if (!req.body?.doctorId || !req.body?.startTime) {
		res.status(400).send('Error: Invalid request');
    console.log(req.body);
		return;
	}

  const requestMessage = JSON.stringify( { doctorId: req.body.doctorId, startTime: req.body.startTime } );
	const options:IClientPublishOptions = { qos: 2 }
	const timeoutDuration = 3000;
	let retries = 0;
	const maxRetries = servicesList.getServicesCount();
	
	console.log("\n")

  const publishRequest = (serviceId: string) => {
    console.log(`Published request: ${requestMessage} to ${requestTopic + serviceId + '/book'}`);

    const messageHandler = (topic: string, message: Buffer) => {
      if (topic === responseTopic + serviceId) {
        clearTimeout(timeout);
        res.send(`Reply: ${message.toString()}`);
        mqttClient.removeListener('message', messageHandler);
        console.log(`Received response: ${message.toString()}\n`);
      }
    };

    mqttClient.on('message', messageHandler);

    mqttClient.publish(requestTopic + serviceId + '/book', requestMessage, options, (err) => {
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
    //publishRequest(initialServiceId);

    mqttClient.publish(requestTopic + initialServiceId + '/book', requestMessage, options, (err) => {
      console.log(`Published request: ${requestMessage} to ${requestTopic + initialServiceId + '/book'}`);
      if (err) return res.status(500).send('Failed to publish request message');
      else return res.status(200).send('Request sent');
    });
  } else {
    res.status(500).send('No available services to handle the request');
    console.log('No available services to handle the request\n');
  }
});

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
	console.log(`API Gateway listening at http://localhost:${port}`);
});
