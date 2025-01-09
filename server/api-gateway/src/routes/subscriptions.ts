import { Router, Request, Response } from "express";
import { broker } from "../index";
import { ServiceType } from "../types/ServiceType";
import { MqttResponse } from "../services/MqttMessages";
import { authMiddleware } from "../middleware/auth";

const router = Router();

/**
 *  Subscribe to doctor's calendar
 *  Request Format:
 *      Endpoint: /subscriptions/doctors
 */
router.post("/subscriptions/doctors", authMiddleware, (req: Request, res: Response) => {
    if (!req.isAuth || !req.user) {
        res.status(401).send("Unauthorized");
        return;
    }

    if(!req.body.doctorId){
		res.status(400).send("Doctor Id is not provided");
		return;
    }

	broker.publishToService(
        ServiceType.Appointments,
        "subscriptions/sub",
        {
            userId: req.user.toString(),
            doctorId: req.body.doctorId.toString(),
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
