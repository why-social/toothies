import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";

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

export default router;
