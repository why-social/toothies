import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/**
 *  Get doctor subscription status
 *  Request Format:
 *      Endpoint: /subscriptions/doctors/:id
 */
router.get(
  "/subscriptions/doctors/:id",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (!req.params.id) {
      res.status(400).send("Doctor Id is not provided");
      return;
    }

    broker.publishToService(
      ServiceType.Appointments,
      "subscriptions/isSub",
      {
        userId: req.user.toString(),
        doctorId: req.params.id.toString(),
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
  }
);

/**
 *  Subscribe to doctor's calendar
 *  Request Format:
 *      Endpoint: /subscriptions/doctors/:id
 */
router.post(
  "/subscriptions/doctors/:id",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (!req.params.id) {
      res.status(400).send("Doctor Id is not provided");
      return;
    }

    broker.publishToService(
      ServiceType.Appointments,
      "subscriptions/sub",
      {
        userId: req.user.toString(),
        doctorId: req.params.id.toString(),
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
  }
);

/**
 *  Unsubscribe from a doctor's calendar
 *  Request Format:
 *      Endpoint: /subscriptions/doctors/:id
 */
router.delete(
  "/subscriptions/doctors/:id",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    if (!req.params.id) {
      res.status(400).send("Doctor Id is not provided");
      return;
    }

    broker.publishToService(
      ServiceType.Appointments,
      "subscriptions/unsub",
      {
        userId: req.user.toString(),
        doctorId: req.params.id.toString(),
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
  }
);

export default router;
