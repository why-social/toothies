import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Booking endpoints
/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments?doctorId
 */
router.get("/appointments", authMiddleware, (req: Request, res: Response) => {
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
router.get(
  "/appointments/user",
  authMiddleware,
  (req: Request, res: Response) => {
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
  },
);

/**
 *  Get appointment slots of a doctor
 *  Request Format:
 *      Endpoint: /appointments
 *      Body: { userId: ObjectId, doctorId: <ObjectId>, startTime: <Date> }
 */
router.post("/appointments", authMiddleware, (req: Request, res: Response) => {
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
router.delete(
  "/appointments",
  authMiddleware,
  (req: Request, res: Response) => {
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
  },
);

export default router;
