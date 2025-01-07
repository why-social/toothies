import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.ATLAS_CONN_STR) {
	throw new Error("ATLAS_CONN_STR is not defined");
}
if (!process.env.BROKER_ADDR) {
	throw new Error("BROKER_ADDR is not defined");
}
if (!process.env.MQTT_USERNAME) {
	throw new Error("MQTT_USERNAME is not defined");
}
if (!process.env.MQTT_PASSWORD) {
	throw new Error("MQTT_PASSWORD is not defined");
}


var connString = process.env.ATLAS_CONN_STR;
function publishCurrentConnString() {
	broker.publish("db/conn-string", connString);
}

// -------------------- DEFINE BROKER --------------------
const broker: ServiceBroker = new ServiceBroker(
	"db",
	String(process.env.BROKER_ADDR),
	{
		username: String(process.env.MQTT_USERNAME),
		password: String(process.env.MQTT_PASSWORD),
	},
	{
		onFailed() {
			console.error("Failed to start the service");
			process.exit(0);
		},
		onConnected() {
			broker.subscribe("db", (_) => {
				publishCurrentConnString()
			}, false)
		},
	}
);

const atlasConnString = process.env.ATLAS_CONN_STR;
const atlasClient = new MongoClient(atlasConnString);

async function pingAtlas() {
	try {
		await atlasClient.connect();
		const result = await atlasClient.db().command({ ping: 1 }); // expected answer: { ok: 1 }
		if (result.ok !== 1) {
			connString = "backup";
		} else {
			connString = atlasConnString;
		}
	} catch (e) {
		if (e instanceof Error) {
			console.error("MongoDB connection failed. Failover to backup.", e.message);
		}
		else {
			console.error("Unknown error: ", e);
		}
		connString = "backup";
	} finally {
		publishCurrentConnString();
		await atlasClient.close();
	}
}

setInterval(pingAtlas, 5_000);
