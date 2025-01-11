import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
import dotenv from "dotenv";
import { sign, PrivateKey } from "jsonwebtoken";
import { compare } from "bcrypt-ts";
import { User } from "./types/User";
import { DbManager } from "@toothies-org/backup-manager";
import { DatabaseError } from "@toothies-org/backup-manager/dist/types/databaseError";

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

function createAdminToken() {
  return sign(
    {
      userId: "admin",
    },
    jwtKey,
    { expiresIn: "7d" }
  );
}

function createUserToken(user: User) {
  return sign(
    {
      userId: user._id,
      pn: user.personnummer,
      name: user.name,
    },
    jwtKey,
    { expiresIn: "7d" }
  );
}

function createDoctorToken(doctor: User) {
  return sign(
    {
      userId: doctor._id,
      email: doctor.email,
      name: doctor.name,
    },
    jwtKey,
    { expiresIn: "7d" },
  );
}

const db = new DbManager(process.env.ATLAS_CONN_STR, ["users", "doctors"]);
db.init()
  .then(() => console.log("Connected to db"))
  .catch(() => { throw new Error("Failed to connect to db") });

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
const pnRegex = /^(?:19|20)?(\d{2})(\d{2})(\d{2})-?(\d{4})$/;

// ----------------- MQTT CALLBACKS -----------------
// Topic: accounts/login
// Message format: {reqId: <string>, timestamp: <number>, data: {personnummer: <string>, password: <string>}}
const authenticateUser = async (message: Buffer) => {
  let data, reqId, timestamp;
  try {
    const payload = JSON.parse(message.toString());
    data = payload.data;
    reqId = payload.reqId;
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
  if (!data.personnummer || !data.password) {
    broker.publishError(reqId, "Missing fields");
    console.error(`Missing fields in request: ${message}`);
    return;
  }

  try {
    if (data.personnummer == "admin") {
      if (process.env.ADMIN_PASSWORD == data.password) {
        const token = createAdminToken();
        broker.publishResponse(reqId, { token });
      } else {
        broker.publishError(reqId, "User does not exist");
        console.error(`Failed attempt to login into admin account.`);
      }

      return;
    }
    const user = await db.withConnection(async () => {
      return db.collections.get("users").findOne({ personnummer: data.personnummer });
    }, true)
    if (!user) {
      broker.publishError(reqId, "User does not exist");
      console.error(`User does not exist: \n${message}`);
      return;
    }

    if (await compare(data.password, user.passwordHash)) {
      const token = createUserToken(user as User);
      broker.publishResponse(reqId, { token });
    } else {
      broker.publishError(reqId, "Incorrect password");
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      broker.publishResponse(reqId, JSON.parse(e.message));
    } else {
      broker.publishError(reqId, `Unable to process request: ${e}`);
    }
    console.error("Failed to process request", e);
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
    reqId = payload.reqId;
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

  // concatenates all capture groups into one string, to avoid duplicates in different format
  const pnParsed = pnRegex
    .exec(data.personnummer)
    ?.slice(1)
    .reduce((prev, curr, i, arr) => prev + curr);

  try {
    const userExists = await db.withConnection(async () => {
      return db.collections.get("users").findOne({ personnummer: pnParsed, })
    }, true);

    const user = {
      personnummer: pnParsed,
      passwordHash: data.passwordHash,
      name: data.name,
      email: data.email,
    };
    if (!userExists) {
      await db.withConnection(async () => {
        return db.collections.get("users").insertOne(user);
      }, false);
      const token = createUserToken(user as User);
      broker.publishResponse(reqId, { token });
      console.log(`Created user:\n${JSON.stringify(data)}`);
    } else {
      broker.publishError(reqId, "User already exists");
      console.error(`User already exists: \n${message}`);
    }
  } catch (e) {
    if (e instanceof DatabaseError) {
      broker.publishResponse(reqId, JSON.parse(e.message));
    } else {
      broker.publishError(reqId, `Unable to process request: ${e}`);
    }
    console.error("Failed to process request", e);
  }
};

const authenticateDoctor = async (message: Buffer) => {
  let data, reqId, timestamp;
  try {
    const payload = JSON.parse(message.toString());
    data = payload.data;
    reqId = payload.reqId;
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
  if (!data.email || !data.password) {
    broker.publishError(reqId, "Missing fields");
    console.error(`Missing fields in request: ${message}`);
    return;
  }

  try {
    const doctor: any = await db.withConnection(() => {
      return db.collections.get("doctors").findOne({ email: data.email });
    }, true);

    if (!doctor) {
      broker.publishError(reqId, "Doctor does not exist");
      console.error(`Doctor does not exist: \n${message}`);
      return;
    }

    if (!doctor.passwordHash) {
      broker.publishError(reqId, "Doctor has no password");
      console.error(`Doctor has no password: \n${message}`);
      return;
    }

    if (await compare(data.password, doctor.passwordHash)) {
      const token = createDoctorToken(doctor as User);
      broker.publishResponse(reqId, { token });
    } else {
      broker.publishError(reqId, "Incorrect password");
    }
  } catch (e) {
    broker.publishError(reqId, `Error: ${e}`);
    console.error(e);
  }
};

// -------------------- DEFINE BROKER --------------------
const broker: ServiceBroker = new ServiceBroker(
  "accounts",
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
      broker.subscribe("login", authenticateUser);
      broker.subscribe("register", createUser);
      broker.subscribe("doctorLogin", authenticateDoctor);
    },
  }
);

