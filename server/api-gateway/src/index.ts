import { createServer } from "http";
import { Server } from "socket.io";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { ServiceBroker } from "./services/ServiceBroker";
import appointments from "./routes/appointments";
import auth from "./routes/auth";
import clinics from "./routes/clinics";
import doctors from "./routes/doctors";
import slots from "./routes/slots";

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

export const broker = new ServiceBroker();

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

// Attach routed endpoints
app.use("/", appointments);
app.use("/", auth);
app.use("/", clinics);
app.use("/", doctors);
app.use("/", slots);

app.use("/", (req: Request, res: Response, next: NextFunction) => {
  res.send("API Gateway");
});

httpServer.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});
