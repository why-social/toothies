import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { spawn } from "child_process";

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
const BACKUP_DIR = "./backup";


const atlasConnString = process.env.ATLAS_CONN_STR; // this makes TS happy
const atlasClient = new MongoClient(atlasConnString, { maxPoolSize: 1 });
var connString = atlasConnString;
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
		async onConnected() {
			broker.subscribe("db", (_) => {
				publishCurrentConnString()
			}, false)

			await atlasClient.connect();
			setInterval(pingAtlas, 10_000);
			setInterval(async () => {
				console.log("Starting backup and restore");
				await dump();
				await restore();
			}, 1_000_000);

			pingAtlas();
			await dump();
			await restore();
		},
	}
);


async function pingAtlas() {
	try {
		const result = await atlasClient.db().command({ ping: 1 }); // expected answer: { ok: 1 }
		if (result.ok !== 1) {
			connString = getBackupConnectionString();
			console.log("Ping failed");
		} else {
			connString = atlasConnString;
			console.log("Ping successful");
		}
	} catch (e) {
		if (e instanceof Error) {
			console.error("MongoDB connection failed. Failover to backup.", e.message);
		}
		else {
			console.error("Unknown error: ", e);
		}
		connString = getBackupConnectionString();
		publishCurrentConnString();
	}
}

async function dump(): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log("Starting backup...");
		const mongodump = spawn("mongodump", ["--uri", atlasConnString, "-o", BACKUP_DIR]);

		mongodump.stdout.on("data", (data: Buffer) => {
			console.log(`mongdump stdout: ${data}`);
		});
		mongodump.stderr.on("data", (data: Buffer) => {
			console.error(`mongdump stderr: ${data}`);
		});

		mongodump.on("close", (code: number) => {
			if (code === 0) {
				console.log("Backup completed successfully");
				resolve();
			} else {
				const errorMessage = `Backup failed with error code ${code}`;
				console.log(errorMessage);
				reject(new Error(errorMessage));
			}
		});
	});
}

async function restore(): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log("Starting restore...");
		const mongorestore = spawn("mongorestore", ["--dir", BACKUP_DIR, "--drop", "--host=localhost:27017"]);


		mongorestore.stdout.on("data", (data: Buffer) => {
			console.log(`mongdump stdout: ${data}`);
		});
		mongorestore.stderr.on("data", (data: Buffer) => {
			console.error(`mongdump stderr: ${data}`);
		});

		mongorestore.on("close", (code: number) => {
			if (code === 0) {
				console.log("Restore completed successfully");
				resolve();
			} else {
				const errorMessage = `Restore failed with error code ${code}`;
				console.log(errorMessage);
				reject(new Error(errorMessage));
			}
		});
	});
}

function getBackupConnectionString(): string {
	return `mongodb://backup:password@localhost:27017/${process.env.BROKER_ADDR}`
}



