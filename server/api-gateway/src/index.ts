import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import mqtt, { IClientOptions, IClientPublishOptions } from "mqtt";
import { Service } from "./types/Service";
import { ServicesList } from "./types/ServicesList";
import { authMiddleware } from './middleware/auth';
import { createUserToken } from './utils/utils';

const app: Express = express();
const port: number = 3000;

const mqttOptions: IClientOptions = {
  username: "service",
  password: "Ilike2makewalks",
};

const heartbeatTopic = "heartbeat/appointments"; // TODO: general topics

app.use(cors());
// Parse requests of content-type 'application/json'
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const mqttClient = mqtt.connect(
  "tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883",
  mqttOptions,
);

let servicesList: ServicesList = new ServicesList(mqttClient);

mqttClient.on("error", (error) => {
  console.error("Mqtt error:", error);
  mqttClient.end();
});

mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");

  // Subscribe to heartbeat topic
  mqttClient.subscribe(heartbeatTopic, (err) => {
    if (err) return console.error("Failed to subscribe to heartbeat topic");

    console.log(`Subscribed to ${heartbeatTopic}`);
  });

  // Handle heartbeat messages, if a service is not in the list, add it
  mqttClient.on("message", (topic, message) => {
    if (topic === heartbeatTopic) {
      const msgService: Service = Service.fromJSON(message);
      const serviceId = msgService.getServiceId();
      const containerName = msgService.getContainerName();

      if (!servicesList.hasService(serviceId)) {
        servicesList.addService(msgService);
        mqttClient.subscribe(`appointments/${serviceId}/res`, (err) => {
          if (err)
            return console.error(
              `Failed to subscribe to response topic for service: ${containerName}`,
            );
          console.log(`Added service: ${containerName}`);
        });
      } else {
        servicesList.updateHeartbeat(serviceId);
      }
    }
  });
});

function mqttPublishWithResponse(
  req: Request,
  res: Response,
  topic: string,
  message?: Object,
) {
  const options: IClientPublishOptions = { qos: 2 };
  const timeoutDuration = 3000;
  let retries = 0;
  const maxRetries = servicesList.getServicesCount();

  const reqTimestamp = Date.now(); // timestamp to identify req and res
  const requestMessage = message
    ? JSON.stringify({
        ...message,
        timestamp: reqTimestamp,
      })
    : JSON.stringify({ timestamp: reqTimestamp });

  const publishRequest = (serviceId: string) => {
    const publishTopic = `${serviceId}/${topic}`;
    const responseTopic = `${serviceId}/res/${reqTimestamp}`;

    // handler for receiving a response from a service.
    // expects a response message on the topic '${serviceId}/res/${reqTimestamp}'
    const responseHandler = (topic: string, message: Buffer) => {
      if (topic === responseTopic) {
        clearTimeout(timeout);
        mqttClient.removeListener("message", responseHandler);
        mqttClient.unsubscribe(responseTopic);
        console.log(`Received response: ${message.toString()}\n`);
        return res.status(200).send(message.toString());
      }
    };

    // subscribe and attach response handler
    mqttClient.subscribe(responseTopic);
    mqttClient.on("message", responseHandler);

    mqttClient.publish(publishTopic, requestMessage, options, (err) => {
      if (err) return res.status(500).send("Failed to publish request message");
      console.log(`Published request: ${requestMessage} to ${publishTopic}`);
    });

    const timeout = setTimeout(() => {
      console.log(
        `Request to service ${serviceId} timed out. Redirecting to another service...`,
      );
      mqttClient.removeListener("message", responseHandler);
      mqttClient.unsubscribe(responseTopic);
      retries++;
      if (retries < maxRetries) {
        const newServiceId = servicesList
          .getRoundRobinService()
          ?.getServiceId();
        if (newServiceId) {
          publishRequest(newServiceId);
        } else {
          res.status(500).send("No available services to handle the request");
          console.log("No available services to handle the request\n");
        }
      } else {
        res.status(500).send("Request timed out after multiple retries");
        console.log("Request timed out after multiple retries\n");
      }
    }, timeoutDuration);
  };
  const initialServiceId = servicesList.getRoundRobinService()?.getServiceId();
  if (initialServiceId) {
    publishRequest(initialServiceId);
  } else {
    res.status(500).send("No available services to handle the request");
    console.log("No available services to handle the request\n");
  }
}

// Clinic enpoints

/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /clinics
 */
app.get("/doctors", (req: Request, res: Response) => {
  mqttPublishWithResponse(req, res, "doctors/get");
});

// Doctor endpoints
/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments?doctorId
 */
// TODO: Auth
app.get("/appointments", (req: Request, res: Response) => {
  if (!req.query?.doctorId) {
    res.status(400).send("No id specified");
    return;
  }
  mqttPublishWithResponse(req, res, "appointments/get", {
    doctorId: req.query.doctorId,
  });
});

/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments
 *      Body: { doctorId: <ObjectId>, startTime: <Date> }
 */
app.post("/appointments", (req: Request, res: Response) => {
  if (!req.body?.doctorId || !req.body?.startTime) {
    res.status(400).send("Error: Invalid request");
    console.log("Invalid request: ", req.body);
    return;
  }

  mqttPublishWithResponse(req, res, "appointments/book", {
    doctorId: req.body.doctorId,
    startTime: req.body.startTime,
  });
});

/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments
 *      Body: { doctorId: <ObjectId>, startTime: <Date> }
 */
app.delete("/appointments", authMiddleware, (req: Request, res: Response) => {
  if (!req.body?.startTime || !req.body?.doctorId) {
    res.status(400).send("Error: Invalid request");
    console.log(req.body);
    return;
  }

  mqttPublishWithResponse(req, res, "appointments/cancel", {
    doctorId: req.body.doctorId,
    startTime: req.body.startTime,
  });
});

/**
 * Create a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 *   	Body: { startDate: <Date>, endDate: <Date> }
 */
app.post("/slots", authMiddleware, (req: Request, res: Response) => {
	// Check if the user is authorized
	if(!req.isAuth || !req.user) {
		res.status(401).send("Unauthorized");
		return;
	}

	// Publish the request to the MQTT broker
	mqttPublishWithResponse(req, res, "slots/create", {
		doctorId: req.user,
		body: req.body,
	});
});

/**
 * Delete a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 *  	Body: { startDate: <Date> }
 */
app.delete("/slots", authMiddleware, (req: Request, res: Response) => {
	// Check if the user is authorized
	if(!req.isAuth || !req.user) {
		res.status(401).send("Unauthorized");
		return;
	}

	// Publish the request to the MQTT broker
	mqttPublishWithResponse(req, res, "slots/delete", {
		doctorId: req.user,
		body: req.body,
	});
});

/**
 * Edit a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 * 		Body: { oldStartDate: <Date>, newStartDate: <Date>, newEndDate: <Date> }
 */
app.patch("/slots", authMiddleware, (req: Request, res: Response) => {
	// Check if the user is authorized
	if(!req.isAuth || !req.user) {
		res.status(401).send("Unauthorized");
		return;
	}

	// Publish the request to the MQTT broker
	mqttPublishWithResponse(req, res, "slots/edit", {
		doctorId: req.user,
		body: req.body,
	});
});

app.post("/generateToken", (req: Request, res: Response) => {
	if(!req.body?.id) {
		res.status(400).send("Error: Invalid request");
		return;
	}
	const token = createUserToken(req.body.id);
	res.status(200).send(token);
})

app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("API Gateway");
});

app.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});
