import { BrokerConnection } from "./modules/broker/brokerConnection";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { sign, verify, PrivateKey } from "jsonwebtoken";
import { User } from "./types/User";

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
if (!process.env.JWT_KEY) {
  throw new Error("JWT_KEY is not defined");
}
const jwtKey: PrivateKey = process.env.JWT_KEY;

function createUserToken(user: User) {
  return sign(
    {
      pn: user.personnummer,
      name: user.name,
    },
    jwtKey,
    { expiresIn: "7d" },
  );
}

const atlasClient = new MongoClient(process.env.ATLAS_CONN_STR);
const db = atlasClient.db("primary");
const users = db.collection("users");
/*
 * Email regex
 * - Must contain @
 * - Must contain .
 * - Must not contain spaces
 * - Must have at least 1 character before and after @
 * - Must have at least 1 character before and after .
 * - Length between 3 and 40
 */
const emailRegex = /^(?=.{3,40}$)[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Personnummer regex
 * - 10 or 12 digits, '-' optional
 * - last 2 digits in capture group 1
 * - month in capture group 2
 * - day in capture group 3
 * - unique nums in capture group 4
 */
const pnRegex = /^(?:19|20)?(\d{2})(\d{2})(\d{2})?-?(\d{4})$/;

// ----------------- MQTT CALLBACKS -----------------
// Topic: accounts/login
// Message format: {reqId: <string>, timestamp: <number>, data: {personnummer: <string>, passwordHash: <string>}}
const authenticateUser = async (message: Buffer) => {
  let data, reqId, timestamp;
  try {
    const payload = JSON.parse(message.toString());
    data = payload.data;
    reqId = payload.timestamp; // TODO change to reqId
    timestamp = payload.timestamp;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    broker.publishError(reqId, "Malformed request");
    return;
  }

  if (!data || !timestamp) {
    // TODO add check for reqId
    broker.publishError(reqId, "Malformed request");
    console.error(`Malformed request: ${message}`);
    return;
  }
  if (!data.personnummer || !data.passwordHash) {
    broker.publishError(reqId, "Missing fields");
    console.error(`Missing fields in request: ${message}`);
    return;
  }

  const user = await users.findOne({ personnummer: data.personnummer });
  if (!user) {
    broker.publishError(reqId, "User does not exist");
    console.error(`User does not exist: \n${message}`);
    return;
  }

  if (user.passwordHash == data.passwordHash) {
    const token = createUserToken(user as User);
    broker.publishResponse(reqId, { token });
  } else {
    broker.publishError(reqId, "Incorrect password");
  }
};

// Create/register a user
// Topic: accounts/register
// Message format:
// { reqId: <number>, timestamp: <number>,
//   data: { personnummer: <string>, passwordHash: <string>, name: <string>, email: <string>}
// }
const createUser = async (message: Buffer) => {
  let data, reqId, timestamp;
  try {
    const payload = JSON.parse(message.toString());
    data = payload.data;
    reqId = payload.timestamp; // TODO change to reqId
    timestamp = payload.timestamp;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    } else {
      console.error(e);
    }
    broker.publishError(timestamp, "Malformed request");
    return;
  }

  if (!data || !timestamp) {
    // TODO add check for reqId
    broker.publishError(reqId, "Malformed request");
    console.error(`Malformed request: ${message}`);
    return;
  }
  if (!data.personnummer || !data.passwordHash || !data.name || !data.email) {
    broker.publishError(reqId, "Missing fields");
    console.error(`Missing fields in request: ${message}`);
    return;
  }

  if (!pnRegex.test(data.personnummer)) {
    broker.publishError(reqId, "Invalid personnummer");
    console.error(`Invalid personnummer: ${data.personnummer}`);
    return;
  }

  if (!emailRegex.test(data.email)) {
    broker.publishError(reqId, "Invalid email");
    console.error(`Invalid email: ${data.email}`);
    return;
  }

  const userExists = await users.findOne({
    personnummer: data.personnummer,
  });

  if (!userExists) {
    users.insertOne(data);
    broker.publishResponse(reqId, data);
    console.log(`Created user:\n${JSON.stringify(data)}`);
  } else {
    broker.publishError(reqId, "Invalid personnummer");
    console.error(`User already exists: \n${message}`);
  }
};

// -------------------- DEFINE BROKER --------------------
const broker: BrokerConnection = new BrokerConnection("accounts", {
  onFailed() {
    process.exit(0);
  },
  onConnected() {
    // TODO: topics must include serviceId
    broker.subscribe("login", authenticateUser);
    broker.subscribe("register", createUser);
  },
});
