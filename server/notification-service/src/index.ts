import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
import { ObjectId } from "mongodb";
import dotenv from "dotenv";
import { sendEmail } from "./utils/sendEmail";
import { DbManager } from "@toothies-org/backup-manager";

dotenv.config();
if (!process.env.ATLAS_CONN_STR) {
	throw new Error("ATLAS_CONN_STR is not defined");
}
if (!process.env.MQTT_USERNAME) {
	throw new Error("MQTT_USERNAME is not defined");
}
if (!process.env.MQTT_PASSWORD) {
	throw new Error("MQTT_PASSWORD is not defined");
}

const db = new DbManager(process.env.ATLAS_CONN_STR, ["users", "doctors"]);
db.init()
	.then(() => {
		console.log("Connected to db");
	})
	.catch(() => {
		throw new Error("Failed to connect to db");
	});


// Notify a doctor via email
// Topic: notifications/doctor
// Message format:
// { reqId: <number>, timestamp: <number>,
//   data: { userId: <string>, emailMessage: {subject: <string>, text: <string>, html: <string>} }
// }
const notifyDoctor = async (message: Buffer) => {
	let data, reqId, timestamp;
	try {
		const payload = JSON.parse(message.toString());
		data = payload.data;
		reqId = payload.timestamp;
		timestamp = payload.timestamp;
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
		} else {
			console.error(e);
		}
		console.log(`Malformed request: ${message}`);
		return;
	}

	if (!data || !timestamp) {
		console.error(`Malformed request: ${message}`);
		return;
	}
	if (
		!data.emailMessage ||
		!data.emailMessage.subject ||
		!data.emailMessage.text ||
		!data.emailMessage.html
	) {
		console.error(`Missing required fields in request: ${message}`);
		return;
	}


	// Send email
	try {
		const doctor: any = await db.withConnection(() => {
			return db.collections.get("doctors").findOne({
				_id: new ObjectId(data.userId),
			});
		}, true);

		if (!doctor) {
			console.error(`Doctor not found: ${message}`);
			return;
		}

		if (!doctor.email) {
			console.log(`Doctor ${doctor.name} does not have an email address`);
			return;
		}

		await sendEmail(
			doctor.email,
			doctor.name,
			data.emailMessage.subject,
			data.emailMessage.text,
			data.emailMessage.html,
		);
		console.log(
			`Email sent to doctor: ${doctor.email}\nEmail text: ${data.emailMessage.text}`,
		);
	} catch (e) {
		console.error("Failed to send email to doctor");
		console.error(e);
	}
};

const notifyUser = async (message: Buffer) => {
	let data, reqId, timestamp;
	try {
		const payload = JSON.parse(message.toString());
		data = payload.data;
		reqId = payload.timestamp;
		timestamp = payload.timestamp;
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
		} else {
			console.error(e);
		}
		console.log(`Malformed request: ${message}`);
		return;
	}

	if (!data || !timestamp) {
		console.error(`Malformed request: ${message}`);
		return;
	}
	if (!data.emailMessage || !data.emailMessage.subject || !data.emailMessage.text || !data.emailMessage.html) {
		console.error(`Missing required fields in request: ${message}`);
		return;
	}


	// Send email
	try {
		const user: any = await db.withConnection(() => {
			return db.collections.get("users").findOne({
				_id: new ObjectId(data.userId),
			});
		}, true);

		if (!user) {
			console.error(`User not found: ${message}`);
			return;
		}

		if (!user.email) {
			console.log(`User ${user.name} does not have an email address`);
			return;
		}

		await sendEmail(
			user.email,
			user.name,
			data.emailMessage.subject,
			data.emailMessage.text,
			data.emailMessage.html,
		);
		console.log(
			`Email sent to user: ${user.email}\nEmail text: ${data.emailMessage.text}`,
		);
	} catch (e) {
		console.error("Failed to send email to user");
		console.error(e);
	}
}

const notifySubscribedUsers = async (message: Buffer) => {
	let data, reqId, timestamp;
	try {
		const payload = JSON.parse(message.toString());
		data = payload.data;
		reqId = payload.timestamp;
		timestamp = payload.timestamp;
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.message);
		} else {
			console.error(e);
		}
		console.log(`Malformed request: ${message}`);
		return;
	}

	if (!data || !timestamp) {
		console.error(`Malformed request: ${message}`);
		return;
	}

	if (!data.doctorId || !data.startTime || !data.endTime) {
		console.error(`Missing required fields in request: ${message}`);
		return;
	}

	try {
		const doctorCursor: any = await db.withConnection(() => {
			return db.collections.get("doctors").aggregate([
				{ $match: { _id: new ObjectId(data.doctorId) } },
				{
					$lookup: {
						from: "users",
						localField: "subscribers",
						foreignField: "_id",
						as: "subscribers",
					},
				},
			]);
		}, true);
		const doctor = await doctorCursor.next();
	
		if (!doctor) {
			console.error(`Doctor not found: ${message}`);
			return;
		}
		
		const subscribers = doctor.subscribers;

		if (!subscribers) {
			console.error(`No subscribed users found for doctor ${doctor.name}`);
			return;
		}

		const emailMessage = {
			subject: "Slot Created",
			text: `A new slot has been created by Dr. ${doctor.name} from ${data.startTime} to ${data.endTime}`,
			html: `A new slot has been created by Dr. ${doctor.name} from ${data.startTime} to ${data.endTime}`,
		};

		for (const user of doctor.subscribers) {
			try {
				await sendEmail(
					user.email,
					user.name,
					emailMessage.subject,
					emailMessage.text,
					emailMessage.html,
				);
				console.log(
					`Email sent to user: ${user.email}\nEmail text: ${emailMessage.text}`,
				);
			} catch (e) {
				console.error(`Failed to send email to user: ${user.email}`);
				console.log(e);
			}
		}
	} catch (e) {
		console.error(`Failed to send email to subscribed users`);
		console.log(e);
	}

}

//-------------------- DEFINE BROKER --------------------
const broker: ServiceBroker = new ServiceBroker(
	"notifications",
	String(process.env.BROKER_ADDR),
	{
		username: String(process.env.MQTT_USERNAME),
		password: String(process.env.MQTT_PASSWORD),
	},
	{
		onFailed() {
			process.exit(0);
		},
		onConnected() {
			// TODO: topics must include serviceId
			broker.subscribe("notifications/doctor", notifyDoctor, false);
			broker.subscribe("notifications/user", notifyUser, false);
			broker.subscribe("notifications/subscription/slotCreated", notifySubscribedUsers, false)
		},
	},
);
