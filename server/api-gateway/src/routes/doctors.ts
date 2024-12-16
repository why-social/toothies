import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/**
 *  Get all doctors
 *  Request Format:
 *      Endpoint: /doctors
 */
router.get("/doctors", (req: Request, res: Response) => {
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

/**
 *  Get appointment slots of a doctor, with auth and populated with patient names
 *  Request Format:
 *      Endpoint: /doctor/appointments?date
 * 				/doctor/appointment?week
 */
router.get(
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
router.get(
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

export default router;
