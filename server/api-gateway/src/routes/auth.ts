import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { createUserToken } from "../utils/utils";

const router = Router();

router.post("/generateToken", (req: Request, res: Response) => {
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
router.post("/auth/login", (req: Request, res: Response) => {
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


router.post("/auth/doctorLogin", (req: Request, res: Response) => {
	if(!req.body.email || !req.body.password) {
		res.status(400).send("Error: Invalid request");
		return;
	}
	broker.publishToService(
		ServiceType.Accounts,
		"doctorLogin",
		{
			email: req.body.email,
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
})

/*
 * Register a user. Returns user data on success
 */
router.post("/auth/register", (req: Request, res: Response) => {
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

export default router;
