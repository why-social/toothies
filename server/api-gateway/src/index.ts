import { createServer } from "http";
import { Server } from "socket.io";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { ServicesList } from "./types/ServicesList";
import { authMiddleware } from "./middleware/auth";
import { createUserToken } from "./utils/utils";
import { ServiceType } from "./types/ServiceType";
import { MqttResponse } from "./services/MqttMessages";
import { ServiceBroker } from "./services/ServiceBroker";

const app: Express = express();
const port: number = 3000;
const httpServer = createServer(app);
const socket = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());
// Parse requests of content-type 'application/json'
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const broker = new ServiceBroker();

broker.subscribe("heartbeat/+", (topic: string, message: Buffer) => {
  const match = /^heartbeat\/(\w+)$/.exec(topic);
  if (match && match[1]) {
    const serviceType = match[1];
    broker.fromHeartbeat(serviceType, message.toString());
  }
});

// Subscrive to live calendar updates
// forward live update to corresponding socket namespace
broker.subscribe("appointments/+", (topic: string, message: Buffer) => {
  const match = /^appointments\/(\w+)$/g.exec(topic);
  if (match && match.length == 2) {
    console.log(`Live update: [${topic}]: ${message.toString()}`);
    socket.emit(match[1], message.toString());
    console.log(`Emitted to socket [${match[1]}]: ${message.toString()}`);
  }
});

// Clinic enpoints
/**
 *  Get all clinics
 *  Request Format:
 *      Endpoint: /clinics
 */
app.get("/clinics", (req: Request, res: Response) => {
  broker.publishToService(
    ServiceType.Appointments,
    "clinics/get",
    {},
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
});

/**
 *  Get a clinic
 *  Request Format:
 *      Endpoint: /clinics/:id
 */
app.get("/clinics/:id", (req: Request, res: Response) => {
  if (!req.params.id) {
    res.status(400).send("No id");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "clinics/get",
    { clinicId: req.params.id },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
});

/**
 *  Get all doctors
 *  Request Format:
 *      Endpoint: /doctors
 */
app.get("/doctors", (req: Request, res: Response) => {
  broker.publishToService(
    ServiceType.Appointments,
    "doctors/get",
    {},
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
});

// Booking endpoints
/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments?doctorId
 */
app.get("/appointments", authMiddleware, (req: Request, res: Response) => {
  if (!req.query?.doctorId) {
    res.status(400).send("No doctor id specified");
    return;
  }

  if (!req.isAuth || !req.user) {
    res.status(401).send("Unauthorized");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "appointments/get",
    { doctorId: req.query.doctorId },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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

  broker.publishToService(
    ServiceType.Appointments,
    "appointments/getUser",
    { userId: req.user },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
      broker.publishToService(
        ServiceType.Appointments,
        "appointments/getDocDate",
        { doctorId: req.user, date: req.query.date },
        {
          onResponse(mres: MqttResponse) {
            // todo: get status from response
            res.status(200).send(mres.data);
          },
          onServiceError(msg: string) {
            res.status(500).send(msg);
          },
        },
      );
    } else if (req.query.patientName) {
      broker.publishToService(
        ServiceType.Appointments,
        "appointments/getDocPatient",
        { doctorId: req.user, patientName: req.query.patientName },
        {
          onResponse(mres: MqttResponse) {
            // todo: get status from response
            res.status(200).send(mres.data);
          },
          onServiceError(msg: string) {
            res.status(500).send(msg);
          },
        },
      );
    } else {
      res.status(400).send("Invalid request");
    }
  },
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

    broker.publishToService(
      ServiceType.Appointments,
      "appointments/getDocUpcoming",
      { doctorId: req.user },
      {
        onResponse(mres: MqttResponse) {
          // todo: get status from response
          res.status(200).send(mres.data);
        },
        onServiceError(msg: string) {
          res.status(500).send(msg);
        },
      },
    );
  },
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

  broker.publishToService(
    ServiceType.Appointments,
    "appointments/book",
    {
      userId: req.user,
      doctorId: req.body.doctorId,
      startTime: req.body.startTime,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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

  broker.publishToService(
    ServiceType.Appointments,
    "appointments/cancel",
    {
      userId: req.user,
      doctorId: req.body.doctorId,
      startTime: req.body.startTime,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
  broker.publishToService(
    ServiceType.Appointments,
    "slots/create",
    {
      doctorId: req.user,
      body: req.body,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
  broker.publishToService(
    ServiceType.Appointments,
    "slots/delete",
    {
      doctorId: req.user,
      body: req.body,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
  broker.publishToService(
    ServiceType.Appointments,
    "slots/edit",
    {
      doctorId: req.user,
      body: req.body,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
  broker.publishToService(
    ServiceType.Accounts,
    "login",
    {
      personnummer: req.body.personnummer,
      password: req.body.password,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
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
  broker.publishToService(
    ServiceType.Accounts,
    "register",
    {
      name: req.body.name,
      email: req.body.email,
      personnummer: req.body.personnummer,
      passwordHash: req.body.passwordHash,
    },
    {
      onResponse(mres: MqttResponse) {
        // todo: get status from response
        res.status(200).send(mres.data);
      },
      onServiceError(msg: string) {
        res.status(500).send(msg);
      },
    },
  );
});

app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("API Gateway");
});

httpServer.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});
