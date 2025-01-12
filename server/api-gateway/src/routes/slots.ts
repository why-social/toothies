import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/**
 * Create a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 *   	Body: { startDate: <Date>, endDate: <Date> }
 */
router.post("/slots", authMiddleware, (req: Request, res: Response) => {
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
      onResponse(response: MqttResponse) {
        res.status(response.status || 200).send(response.data);
      },
      onServiceError(message: string) {
        res.status(500).send(message);
      },
    }
  );
});

/**
 * Delete a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 *  	Body: { startDate: <Date> }
 */
router.delete("/slots", authMiddleware, (req: Request, res: Response) => {
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
      onResponse(response: MqttResponse) {
        res.status(response.status || 200).send(response.data);
      },
      onServiceError(message: string) {
        res.status(500).send(message);
      },
    }
  );
});

/**
 * Edit a slot for a doctor
 * Request Format:
 * 		Endpoint: /slots
 * 		Body: { oldStartDate: <Date>, newStartDate: <Date>, newEndDate: <Date> }
 */
router.patch("/slots", authMiddleware, (req: Request, res: Response) => {
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
      onResponse(response: MqttResponse) {
        res.status(response.status || 200).send(response.data);
      },
      onServiceError(message: string) {
        res.status(500).send(message);
      },
    }
  );
});

export default router;
