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
let users: any;
let doctors: any;

db.init().then(() => {
	users = db.collections.get("users");
	doctors = db.collections.get("doctors");
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

	const doctor = await doctors.findOne({
		_id: new ObjectId(data.userId),
	});

	if (!doctor) {
		console.error(`Doctor not found: ${message}`);
		return;
	}

	if (!doctor.email) {
		console.log(`Doctor ${doctor.name} does not have an email address`);
		return;
	}

	// Send email
	try {
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
		console.error(`Failed to send email to doctor: ${doctor.email}`);
		console.log(e);
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

	const user = await users.findOne({
		_id: new ObjectId(data.userId),
	});

	if (!user) {
		console.error(`User not found: ${message}`);
		return;
	}

	if (!user.email) {
		console.log(`User ${user.name} does not have an email address`);
		return;
	}

	// Send email
	try {
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
		console.error(`Failed to send email to user: ${user.email}`);
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
		},
	},
);
