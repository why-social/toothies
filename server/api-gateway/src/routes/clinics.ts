import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Clinic enpoints
/**
 *  Get all clinics
 *  Request Format:
 *      Endpoint: /clinics
 */
router.get("/clinics", (req: Request, res: Response) => {
  broker.publishToService(
    ServiceType.Appointments,
    "clinics/get",
    {},
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
 *  Get a clinic
 *  Request Format:
 *      Endpoint: /clinics/:id
 */
router.get("/clinics/:id", (req: Request, res: Response) => {
  if (!req.params.id) {
    res.status(400).send("No id");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "clinics/get",
    { clinicId: req.params.id },
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
 *  Create a clinic
 *  Request Format:
 *      Endpoint: /clinics
 *      Body: { name: <string>, location: <Location> }
 */
router.post("/clinics", authMiddleware, (req: Request, res: Response) => {
  if (!req.isAuth || req.user != "admin") {
    res.status(401).send("Unauthorized");
    return;
  }

  if (
    !req.body ||
    !req.body.name ||
    req.body.name.length == 0 ||
    !req.body.location ||
    !req.body.location.latitude ||
    !req.body.location.longitude ||
    !req.body.location.city ||
    req.body.location.city == 0 ||
    !req.body.location.address ||
    req.body.location.address == 0
  ) {
    res.status(400).send("Malformed body.");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "clinics/post",
    {
      name: req.body?.name,
      location: req.body?.location,
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
 *  Delete a clinic
 *  Request Format:
 *      Endpoint: /clinics/:id
 */
router.delete("/clinics/:id", authMiddleware, (req: Request, res: Response) => {
  if (!req.params.id) {
    res.status(400).send("No id");
    return;
  }

  if (!req.isAuth || req.user != "admin") {
    res.status(401).send("Unauthorized");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "clinics/delete",
    { clinicId: req.params.id },
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
