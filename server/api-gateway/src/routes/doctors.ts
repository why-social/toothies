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
          onResponse(response: MqttResponse) {
            res.status(response.status || 200).send(response.data);
          },
          onServiceError(message: string) {
            res.status(500).send(message);
          },
        }
      );
    } else if (req.query.patientName) {
      broker.publishToService(
        ServiceType.Appointments,
        "appointments/getDocPatient",
        { doctorId: req.user, patientName: req.query.patientName },
        {
          onResponse(response: MqttResponse) {
            res.status(response.status || 200).send(response.data);
          },
          onServiceError(message: string) {
            res.status(500).send(message);
          },
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

/*
 *  Cancel an appointment by doctor
 *  Request Format:
 *      Endpoint: /doctor/appointments/:id
 */
router.delete(
  "/doctor/appointments",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
      res.status(401).send("Unauthorized");
      return;
    }

    broker.publishToService(
      ServiceType.Appointments,
      "appointments/cancelByDoc",
      { doctorId: req.user, startTime: req.body.startTime },
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
 *  Create a doctor
 *  Request Format:
 *      Endpoint: /clinics
 *      Body: { name: <string>, type: <string>, clinic: <ObjectId>, email: <string>, passwordHash: <string> }
 */
router.post("/doctors", authMiddleware, (req: Request, res: Response) => {
  if (!req.isAuth || req.user != "admin") {
    res.status(401).send("Unauthorized");
    return;
  }

  if (
    !req.body ||
    !req.body.name ||
    req.body.name.length == 0 ||
    !req.body.email ||
    req.body.email.length == 0 ||
    !req.body.passwordHash ||
    req.body.passwordHash.length == 0 ||
    !req.body.clinic
  ) {
    res.status(400).send("Malformed body.");
    return;
  }

  broker.publishToService(
    ServiceType.Appointments,
    "doctors/post",
    {
      name: req.body.name,
      type:
        req.body.type && req.body.type.length > 0 ? req.body.type : undefined,
      email: req.body.email,
      clinic: req.body.clinic,
      passwordHash: req.body.passwordHash,
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
 *  Delete a doctor
 *  Request Format:
 *      Endpoint: /doctors/:id
 */
router.delete("/doctors/:id", authMiddleware, (req: Request, res: Response) => {
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
    "doctors/delete",
    { doctorId: req.params.id },
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
