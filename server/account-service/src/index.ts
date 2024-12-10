import { BrokerConnection } from "./modules/broker/brokerConnection";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
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

const broker: BrokerConnection = new BrokerConnection("accounts", {
  onFailed() {
    process.exit(0);
  },
  onConnected() {
    // Topic: accounts/login
    // Message format: {username: <string>, password_hash: <string>}
    broker.subscribe("login", (message) => {
      console.log(message.toString());
    });

    // Topic: accounts/register
    // Message format: {reqId: <number>, timestamp: <number>, data: {personnummer: <string>, password_hash: <string>, name: <string>, email: <string>}}
    broker.subscribe("register", async (message) => {
      const payload = JSON.parse(message.toString());
      const data = payload.data;
      const reqId = payload.reqId;

      if (
        !data.personnummer ||
        !data.password_hash ||
        !data.name ||
        !data.email
      ) {
        broker.publish(`res/${reqId}`, '{error: "Missing fields"');
        console.error(`Missing fields in request: ${message}`);
        return;
      }

      if (!pnRegex.test(data.personnummer)) {
        broker.publish(`res/${reqId}`, '{error: "Invalid personnummer"');
        console.error(`Invalid personnummer: ${data.personnummer}`);
        return;
      }

      if (!emailRegex.test(data.email)) {
        broker.publish(`res/${reqId}`, '{error: "Invalid email"');
        console.error(`Invalid email: ${data.email}`);
        return;
      }

      const userExists = await users.findOne({
        personnummer: data.personnummer,
      });

      if (!userExists) {
        users.insertOne(data);
        broker.publish(`res/${reqId}`, JSON.stringify(data));
        console.log(`Created user: \n${JSON.stringify(data)}`);
      } else {
        broker.publish(`res/${reqId}`, '{error: "User already exists"');
        console.error(`User already exists: \n${message}`);
      }
    });
  },
});
