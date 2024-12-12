import mqtt, { IClientOptions } from "mqtt";
import uniqid from "uniqid";
import Docker from "dockerode";
import os from "os";
import dotenv from "dotenv";
import { Service } from "./types/Service";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

if (!process.env.ATLAS_CONN_STR) {
  throw new Error("ATLAS_CONN_STR is not defined");
}
const atlasClient = new MongoClient(process.env.ATLAS_CONN_STR);
const db = atlasClient.db("primary");
const slots = db.collection("slots");
const doctors = db.collection("doctors");
const clinics = db.collection("clinics");
const users = db.collection("users");

let containerName: string;
async function getContainerName(): Promise<string> {
  if (process.env.CONTAINER_NAME) return process.env.CONTAINER_NAME;

  const docker = new Docker({ socketPath: "/var/run/docker.sock" });
  try {
    const containerId = os.hostname();
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return data.Name.replace("/", ""); // Remove leading slash
  } catch (error) {
    console.error("Could not get container name, name will be set to unknown");
    return "unknown";
  }
}

const mqttOptions: IClientOptions = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
};

const mqttClient = mqtt.connect(
  "tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883",
  mqttOptions
);

const serviceId: string = process.env.TEST_TOPIC ? `test` : uniqid();
const heartbeatTopic = "heartbeat/appointments";
const heartBeatInterval = 10000;

console.log(`Service ${serviceId} is running, connecting to MQTT broker...`);

mqttClient.on("connect", async () => {
  console.log("Connected to MQTT broker");

  containerName = await getContainerName();

  // Subscribe to request topics
  mqttClient.subscribe(serviceId + "/clinics/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to clinics/#`);
  });

  mqttClient.subscribe(serviceId + "/appointments/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to appoinments/#`);
  });

  mqttClient.subscribe(serviceId + "/doctors/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to doctors/#`);
  });

  mqttClient.subscribe(serviceId + "/slots/#", (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to slots/#`);
  });

  // Heartbeat
  setInterval(() => {
    const serviceMsg = new Service(serviceId, containerName).toString();
    const message = `${serviceMsg}`;
    mqttClient.publish(heartbeatTopic, message, (err) => {
      if (err)
        return console.error(`Failed to publish message: ${err.message}`);
    });
  }, heartBeatInterval);
});

/**
 * Appointment endpoints:
 *   Topic: <instance>/appointments/<action>
 *     where instance is id of the service instance, action is 'get', 'book' or 'cancel'
 *   Message: { "timestamp": <long>, doctorId": <ObjectId>, "startTime": <Date> }
 * Response Format (to the API gateway):
 *   Topic: <instance>/appointments/res
 *   Message: { "timestamp": <long>, "message": <string>}
 * Notification Format (to the client):
 *   Topic: appointments/<doctorId>
 *   Message: { "startTime": <Date>, "isBooked": <bool> }
 */

/**
 * Appointment endpoints:
 *   Topic: doctors/<instance>/<action>
 *     where instance is id of the service instance, action is 'get' or '
 */
mqttClient.on("message", async (topic, message) => {
  console.log(`Received request [${topic}]:${message.toString()}`); // DEBUG

  // correct topic is matched,
  // endpoint put into capture group 1 (params[1]),
  // action punt into capture group 2 (params[2])
  // params[0] is the whole match
  const params = /^\w+\/(\w+)\/(\w+)$/g.exec(topic);
  if (params?.length != 3) {
    console.error(
      "Invalid topic. Expected format: <instanceId>/<endpoint>/<action>"
    );
    return;
  }
  const endpoint = params[1];
  const action = params[2];
  const payload = JSON.parse(message.toString());
  payload.action = action;

  // handle requests
  switch (endpoint) {
    case "clinics": {
      switch (action) {
        case "get": {
          let res;
          // TODO project only relevant fields
          if (payload.clinicId) {
            res = await clinics
              .aggregate([
                { $match: { _id: new ObjectId(payload.clinicId) } },
                {
                  $lookup: {
                    from: "doctors",
                    localField: "_id",
                    foreignField: "clinic",
                    as: "doctors",
                  },
                },
              ])
              .toArray();
          } else {
            res = await clinics.find().toArray();
          }

          const responseTopic = `${serviceId}/res/${payload.timestamp}`;
          mqttClient.publish(responseTopic, JSON.stringify(res));
        }
      }
    }
    case "appointments": {
      if (!action || !payload.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        break;
      }

      payload.doctorId = new ObjectId(payload.doctorId);
      payload.userId = new ObjectId(payload.userId);

      await handleAppointmentsRequest(payload);
      break;
    }

    case "doctors": {
      switch (action) {
        case "get":
          await getAllDoctors(payload);
          break;
      }
      break;
    }

    case "slots": {
      handleSlotRequest(payload);
      break;
    }
  }
});

// TODO: explicitly close connections

async function handleAppointmentsRequest(payload: any) {
  const responseTopic = `${serviceId}/res/${payload.timestamp}`;
  let slot;

  switch (payload.action) {
    case "get":
      const doctorSlots = await slots
        .find(
          { doctorId: payload.doctorId },
          { projection: { _id: 0, doctorId: 0 } }
        )
        .toArray();

      const doctor = await doctors.findOne({ _id: payload.doctorId });
      const clinic = await clinics.findOne({ _id: doctor?.clinic });
      if (!doctor || !clinic) {
        mqttClient.publish(
          responseTopic,
          "Could not fetch doctor data for slot"
        );
        break;
      }

      const res = {
        doctor: {
          _id: doctor._id,
          name: doctor.name,
          clinic: {
            _id: clinic._id,
            name: clinic.name,
          },
        },
        slots: doctorSlots,
      };

      console.log(res);
      mqttClient.publish(responseTopic, JSON.stringify(res));
      console.log("Published ", res);
      break;

    case "book": // book a slot
	  if(!payload.startTime) {
		console.error("Invalid query:");
		console.log(payload);
		break;
	  }
      payload.startTime = new Date(payload.startTime);
      slot = await slots.findOne({
        doctorId: payload.doctorId,
        startTime: payload.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: payload.timestamp,
            message: "Error: Slot does not exist",
          })
        );
        return;
      }
      if (slot.isBooked) {
        console.error("Slot already booked");
        console.log(payload);
        console.log(slot);
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: payload.timestamp,
            message: "Error: Slot already booked",
          })
        );
        return;
      }

      slot.isBooked = true;
      slot.bookedBy = payload.userId;
      await slots.updateOne(
        { _id: slot._id },
        { $set: { isBooked: true, bookedBy: payload.userId } }
      );

      mqttClient.publish(
        responseTopic,
        JSON.stringify({
          timestamp: payload.timestamp,
          message: "Slot successfully booked",
        })
      );

      // send live update to open calendars
      mqttClient.publish(
        `appointments/${payload.doctorId}`,
        JSON.stringify(slot)
      );
      console.log(`Slot successfully booked: ${payload.startTime}`);
      break;

    case "cancel": // cancel a slot
	  if(!payload.startTime) {
		console.error("Invalid query:");
		console.log(payload);
		break;
	  }
      payload.startTime = new Date(payload.startTime);
      slot = await slots.findOne({
        doctorId: payload.doctorId,
        startTime: payload.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: payload.timestamp,
            message: "Error: Slot does not exist",
          })
        );
        return;
      }
      if (!slot.isBooked) {
        console.error("Slot not booked");
        console.log(payload);
        console.log(slot);
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: payload.timestamp,
            message: "Error: Cannot cancel a non-booked slot",
          })
        );
        return;
      } else if (!slot.bookedBy.equals(payload.userId)) {
        console.error("Slot booked by someone else");
        console.log(payload);
        console.log(slot);
        console.log(slot.bookedBy);
        console.log(payload.userId);
        mqttClient.publish(
          responseTopic,
          JSON.stringify({
            timestamp: payload.timestamp,
            message: "Error: Cannot cancel someone else's slot",
          })
        );
        return;
      }

      slot.isBooked = false;
      slot.bookedBy = null;

      await slots.updateOne(
        { _id: slot._id },
        { $set: { isBooked: false, bookedBy: null } }
      );
      mqttClient.publish(
        responseTopic,
        JSON.stringify({
          message: "Booking successfully cancelled",
        })
      );
      mqttClient.publish(
        `appointments/${payload.doctorId}`,
        JSON.stringify(slot)
      );
      console.log(`Booking successfully cancelled: ${payload.startTime}`);
      break;
	
	case "getDocDate": // get all booked slots for a doctor on a specific day
		getAppointmentsForDoctorOnDate(payload, responseTopic);
		break;

	case "getDocUpcoming":
		getAppointmentsForDoctorUpcoming(payload, responseTopic);
		break;
	
	case "getDocPatient":
		getAppointmentsForDoctorPerPatient(payload, responseTopic);

    default:
      console.error("Invalid action");
      return;
  }
}

async function getAllDoctors(payload: any) {
  const responseTopic = `${serviceId}/res/${payload.timestamp}`;
  let allDoctors = await doctors.find().toArray();
  mqttClient.publish(responseTopic, JSON.stringify(allDoctors));
}

async function handleSlotRequest(payload: any) {
  const responseTopic = `${serviceId}/res/${payload.timestamp}`;
  payload.responseTopic = responseTopic;

  if (!payload.doctorId || !payload.body.startDate)
    return mqttClient.publish(
      responseTopic,
      JSON.stringify({ message: "Invalid request" })
    );

  const startDate = new Date(Number(payload.body.startDate));
  const doctorId = new ObjectId(payload.doctorId);

  // TODO (once doctors are added to doctors collection) Check if the doctor exists
  // const doctor = await doctors.findOne({_id: new Object(payload.doctorId)});
  // if(!doctor)
  // 	return mqttClient.publish(payload.responseTopic, JSON.stringify({message: "Doctor not found"}));

	// Check if the start time is before the current timme
	if (payload.body.startDate <= new Date()) {
	  return mqttClient.publish(
		  responseTopic,
		  JSON.stringify({ message: "Invalid time range" })
    );
  }

  // Check if the time is between 8 am and 8 pm
  if (startDate.getHours() < 8 || startDate.getHours() > 20)
    return mqttClient.publish(
      responseTopic,
      JSON.stringify({ message: "Invalid time range" })
    );

  let endDate;

  if (payload.body.endDate) {
    endDate = new Date(Number(payload.body.endDate));

    // Check if the start time is before the end time
    if (payload.body.startDate >= payload.body.endDate)
      return mqttClient.publish(
        responseTopic,
        JSON.stringify({ message: "Invalid time range" })
      );

    // Check if the start time is before the current time
    if (payload.body.startDate <= new Date())
      return mqttClient.publish(
        responseTopic,
        JSON.stringify({ message: "Invalid time range" })
      );

    // Check if start time and end time are in the same day
    if (startDate.getDate() != endDate.getDate())
      return mqttClient.publish(
        responseTopic,
        JSON.stringify({ message: "Invalid time range" })
      );

    // Check if the slot already exists
    const slotExists = await slots.findOne({
      doctorId: doctorId,
      startTime: startDate,
      endTime: endDate,
    });
    if (slotExists)
      return mqttClient.publish(
        responseTopic,
        JSON.stringify({ message: "Slot already exists" })
      );

    // Check if the slot overlaps with another slot
    const overlappingSlot = await slots.findOne({
      doctorId: doctorId,
      startTime: { $lt: endDate },
      endTime: { $gt: startDate },
    });
    if (overlappingSlot)
      return mqttClient.publish(
        responseTopic,
        JSON.stringify({ message: "Slot overlaps with another slot" })
      );

    // Check if start time is within doctor's working hours (8am - 8pm)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    if (startHour < 8 || endHour > 20)
      return mqttClient.publish(
        payload.responseTopic,
        JSON.stringify({ message: "Slot outside working hours" })
      );
  }

  switch (payload.action) {
    case "create":
      if (!endDate) {
        return mqttClient.publish(
          payload.responseTopic,
          JSON.stringify({ message: "Invalid request" })
        );
      }
      createSlot(payload, doctorId, startDate, endDate);
      break;
    case "delete":
      deleteSlot(payload, doctorId, startDate);
      break;
    case "edit":
      if (!endDate) {
        return mqttClient.publish(
          payload.responseTopic,
          JSON.stringify({ message: "Invalid request" })
        );
      }
      editSlot(payload, doctorId, startDate, endDate);
      break;
  }
}

async function createSlot(payload: any, doctorId: ObjectId ,startDate: Date, endDate: Date){
	const slot = {
		doctorId: doctorId,
		startTime: startDate,
		endTime: endDate,
		bookedBy: null,
		test: true,
	};
	await slots.insertOne(slot);
	mqttClient.publish(payload.responseTopic, JSON.stringify({message: "Slot created"}));
}

async function deleteSlot(payload: any, doctorId: ObjectId, startDate: Date) {
  const slot = await slots.findOne({
    doctorId: doctorId,
    startTime: startDate,
  });

  // Check if the slot exists
  if (!slot)
    return mqttClient.publish(
      payload.responseTopic,
      JSON.stringify({ message: "Slot not found" })
    );

  await slots.deleteOne({ _id: slot._id });
  mqttClient.publish(
    payload.responseTopic,
    JSON.stringify({ message: "Slot deleted" })
  );
}

async function editSlot(
  payload: any,
  doctorId: ObjectId,
  startDate: Date,
  endDate: Date
) {
  if (!payload.body.oldStartDate)
    return mqttClient.publish(
      payload.responseTopic,
      JSON.stringify({ message: "Invalid request" })
    );

  const oldStartDate = new Date(Number(payload.body.oldStartDate));

  // Find the slot to edit
  const slot = await slots.findOne({
    doctorId: doctorId,
    startTime: oldStartDate,
  });
  if (!slot)
    return mqttClient.publish(
      payload.responseTopic,
      JSON.stringify({ message: "Slot not found" })
    );

	// Check if the slot is booked
	if(slot.isBooked || slot.bookedBy)
		return mqttClient.publish(payload.responseTopic, JSON.stringify({message: "Unable to update, slot is booked"}));

  // Edit the slot
  slot.startTime = startDate;
  slot.endTime = endDate;
  await slots.updateOne(
    { _id: slot._id },
    { $set: { startTime: startDate, endTime: endDate } }
  );
  mqttClient.publish(
    payload.responseTopic,
    JSON.stringify({ message: "Slot edited" })
  );
}

async function getAppointmentsForDoctorOnDate(payload: any, responseTopic: string){
	const doctorId = new ObjectId(payload.doctorId);
	const date = new Date(payload.date);

	// Set the start of the day (00:00:00)
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));

    // Set the end of the day (23:59:59)
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

	const dateAppointments = await slots.aggregate([
		{
			$match: {
				doctorId: doctorId,
				startTime: {$gte: startOfDay, $lt: endOfDay}
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "bookedBy",
				foreignField: "_id",
				as: "patientName"
			},
		},
		{
			$unwind: "$patientName"
		},
		{
			$project: {
				startTime: 1,
				endTime: 1,
				doctorId: 1,
				bookedBy: 1,
				patientName: "$patientName.name"
			}
		},
		{
			$sort: {startTime: 1}
		}
	]).toArray();

	const res = JSON.stringify({
		data: dateAppointments,
	})

	mqttClient.publish(responseTopic, res);
}


async function getAppointmentsForDoctorUpcoming(payload: any, responseTopic: string){
	const doctorId = new ObjectId(payload.doctorId);
	const startDate = new Date();
	
	const upcomingAppointments = await slots.aggregate([
		{
			$match: {
				doctorId: doctorId,
				startTime: {$gte: startDate}
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "bookedBy",
				foreignField: "_id",
				as: "patientName"
			},
		},
		{
            $unwind: "$patientName"
        },
		{
			$project: {
				startTime: 1,
				endTime: 1,
				doctorId: 1,
				bookedBy: 1,
				patientName: "$patientName.name"
			}
		},
		{
			$sort: {startTime: 1}
		},
		{
			$limit: 200
		}
	]).toArray();

	const res = JSON.stringify({
		data: upcomingAppointments,
	})

	mqttClient.publish(responseTopic, res);
}

async function getAppointmentsForDoctorPerPatient(payload: any, responseTopic: string){
	const doctorId = new ObjectId(payload.doctorId);
	const patientName = payload.patientName;
	const patient = await users.findOne({name: patientName});
	if(!patient){
		return mqttClient.publish(responseTopic, JSON.stringify({message: "Patient not found"}));
	}
	const patientId = patient._id;

	const patientAppointments = await slots.find({
		doctorId: doctorId,
		bookedBy: patientId
	}).toArray();

	const appointmentsWithNames = patientAppointments.map(appointment => {
		appointment.patientName = patientName;
		return appointment;
	});

	const res = JSON.stringify({
		data: appointmentsWithNames
	})

	mqttClient.publish(responseTopic, res);
}