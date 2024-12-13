import { createServer } from "http";
import { Server } from "socket.io";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import mqtt, { IClientOptions, IClientPublishOptions } from "mqtt";
import { Service } from "./types/Service";
import { ServicesList } from "./types/ServicesList";
import { authMiddleware } from "./middleware/auth";
import { createUserToken } from "./utils/utils";

const app: Express = express();
const port: number = 3000;
const httpServer = createServer(app);
const socket = new Server(httpServer, {
  cors: { origin: "*" },
});

const mqttOptions: IClientOptions = {
  username: "service",
  password: "Ilike2makewalks",
};

const heartbeatTopic = "heartbeat/+";
const heartbeatRx = /^heartbeat\/(\w+)$/;

app.use(cors());
// Parse requests of content-type 'application/json'
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const mqttClient = mqtt.connect(
  "tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883",
  mqttOptions
);

let serviceMap: Map<string, ServicesList> = new Map(); // TODO enum instead of string?

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

  // Subscrive to live calendar updates
  mqttClient.subscribe("appointments/+", (err) => {
    if (err) return console.error("Failed to subscribe to heartbeat topic");

    console.log("Subscribed to appointments/+");
  });

  // Handle heartbeat messages, if a service is not in the list, add it
  mqttClient.on("message", (topic, message) => {
    const match = heartbeatRx.exec(topic);
    if (match && match[1]) {
      const serviceType = match[1];
      const msgService: Service = Service.fromJSON(message);
      const serviceId = msgService.getServiceId();
      const containerName = msgService.getContainerName();

      if (!serviceMap.has(serviceType)) {
        serviceMap.set(serviceType, new ServicesList(mqttClient));
      }

      let servicesList = serviceMap.get(serviceType);
      if (!servicesList) {
        // This cannot possibly happen, but TS forced my hand
        console.error("If you see this, something terrible happened");
        return;
      }

      if (!servicesList.hasService(serviceId)) {
        servicesList.addService(msgService);
      } else {
        servicesList.updateHeartbeat(serviceId);
      }
    }
  });
});

// forward live update to corresponding socket namespace
mqttClient.on("message", (topic, message) => {
  const match = /^appointments\/(\w+)$/g.exec(topic);
  if (match && match.length == 2) {
    console.log(`Live update: [${topic}]: ${message.toString()}`);
    socket.emit(match[1], message.toString());
    console.log(`Emitted to socket [${match[1]}]: ${message.toString()}`);
  }
});

function mqttPublishWithResponse(
  req: Request,
  res: Response,
  service: string,
  topic: string,
  message?: Object
) {
  const options: IClientPublishOptions = { qos: 2 };
  const timeoutDuration = 3000;
  let retries = 0;
  const servicesList = serviceMap.get(service);
  if (!servicesList) {
    res.status(500).send("Error: No available services");
    return;
  }
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
        `Request to service ${serviceId} timed out. Redirecting to another service...`
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
 *  Get all clinics
 *  Request Format:
 *      Endpoint: /clinics
 */
app.get("/clinics", (req: Request, res: Response) => {
  mqttPublishWithResponse(req, res, "appointments", "clinics/get");
});

/**
 *  Get a clinic
 *  Request Format:
 *      Endpoint: /clinics/:id
 */
app.get("/clinics/:id", (req: Request, res: Response) => {
  if (!req.params.id) {
    res.status(400).send("No id");
  }
  mqttPublishWithResponse(req, res, "appointments", "clinics/get", {
    clinicId: req.params.id,
  });
});

/**
 *  Get all doctors
 *  Request Format:
 *      Endpoint: /doctors
 */
app.get("/doctors", (req: Request, res: Response) => {
  mqttPublishWithResponse(req, res, "appointments", "doctors/get");
});

// Booking endpoints
/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments?doctorId
 */
// TODO: Auth
app.get("/appointments", authMiddleware, (req: Request, res: Response) => {
  if (!req.query?.doctorId) {
    res.status(400).send("No doctor id specified");
    return;
  }

  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  mqttPublishWithResponse(req, res, "appointments", "appointments/get", {
    doctorId: req.query.doctorId,
  });
});

/**
 * Get upcoming booked appointments of a user
 * Request Format:
 * 	Endpoint: /appointments/user
 */
app.get("/appointments/user", authMiddleware, (req: Request, res: Response) => {
  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  mqttPublishWithResponse(req, res, "appointments", "appointments/getUser", {
    userId: req.user,
  });
});

/**
 *  Book a slot
 *  Get appointment slots of a doctor, with auth and populated with patient names
 *  Request Format:
 *      Endpoint: /doctor/appointments?date
 * 				/doctor/appointment?week
 */
app.get(
  "/doctor/appointments",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (req.query.date) {
      mqttPublishWithResponse(
        req,
        res,
        "appointments",
        "appointments/getDocDate",
        {
          doctorId: req.user,
          date: req.query.date,
        }
      );
    } else if (req.query.patientName) {
      mqttPublishWithResponse(
        req,
        res,
        "appointments",
        "appointments/getDocPatient",
        {
          doctorId: req.user,
          patientName: req.query.patientName,
        }
      );
    } else {
      res.status(400).send("Invalid request");
    }
  }
);

/**
 *  Get upcoming appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /doctor/appointment/upcoming
 */
app.get(
  "/doctor/appointments/upcoming",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    mqttPublishWithResponse(
      req,
      res,
      "appointments",
      "appointments/getDocUpcoming",
      {
        doctorId: req.user,
      }
    );
  }
);

/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments
 *      Body: { userId: ObjectId, doctorId: <ObjectId>, startTime: <Date> }
 */
app.post("/appointments", authMiddleware, (req: Request, res: Response) => {
  if (!req.body?.doctorId || !req.body?.startTime) {
    res.status(400).send("Error: Invalid request");
    console.log("Invalid request: ", req.body);
    return;
  }

  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  mqttPublishWithResponse(req, res, "appointments", "appointments/book", {
    userId: req.user,
    doctorId: req.body.doctorId,
    startTime: req.body.startTime,
  });
});

/**
 *  Unbook a slot
 *  Request Format:
 *      Endpoint: /appointments
 *      Body: { userId: <ObjectId>, doctorId: <ObjectId>, startTime: <Date> }
 */
app.delete("/appointments", authMiddleware, (req: Request, res: Response) => {
  if (!req.body?.startTime || !req.body?.doctorId) {
    res.status(400).send("Error: Invalid request");
    console.log(req.body);
    return;
  }

  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  mqttPublishWithResponse(req, res, "appointments", "appointments/cancel", {
    userId: req.user,
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
  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  // Publish the request to the MQTT broker
  mqttPublishWithResponse(req, res, "appointments", "slots/create", {
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
  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  // Publish the request to the MQTT broker
  mqttPublishWithResponse(req, res, "appointments", "slots/delete", {
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
  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  // Publish the request to the MQTT broker
  mqttPublishWithResponse(req, res, "appointments", "slots/edit", {
    doctorId: req.user,
    body: req.body,
  });
});

app.post("/generateToken", (req: Request, res: Response) => {
  if (!req.body?.id) {
    res.status(400).send("Error: Invalid request");
    return;
  }
  const token = createUserToken(req.body.id);
  res.status(200).send(token);
});

// User auth endpoints
/*
 * Authenticate a user. Returns a token if pn/password combo is valid
 */
app.post("/auth/login", (req: Request, res: Response) => {
  if (!req.body.personnummer || !req.body.password) {
    res.status(400).send("Error: Invalid request");
    return;
  }
  mqttPublishWithResponse(req, res, "accounts", "accounts/login", {
    data: {
      personnummer: req.body.personnummer,
      password: req.body.password,
    },
  });
});

/*
 * Register a user. Returns user data on success
 */
app.post("/auth/register", (req: Request, res: Response) => {
  if (
    !req.body.personnummer ||
    !req.body.passwordHash ||
    !req.body.name ||
    !req.body.email
  ) {
    res.status(400).send("Error: Invalid request");
    return;
  }
  mqttPublishWithResponse(req, res, "accounts", "accounts/register", {
    data: {
      name: req.body.name,
      email: req.body.email,
      personnummer: req.body.personnummer,
      passwordHash: req.body.passwordHash,
    },
  });
});

app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("API Gateway");
});

httpServer.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});
