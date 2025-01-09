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
  mqttOptions,
);

const serviceId: string = process.env.TEST_TOPIC ? `test` : uniqid();
const heartbeatTopic = "heartbeat/appointments";
const heartBeatInterval = 10000;

console.log(`Service ${serviceId} is running, connecting to MQTT broker...`);

function publishResponse(reqId: string, data: object) {
  const message = JSON.stringify({
    reqId,
    timestamp: Date.now(),
    data,
  });
  mqttClient.publish(`res/${reqId}`, message);
  console.log(`Published response to res/${reqId}:\n${message}`);
}

mqttClient.on("connect", async () => {
  console.log("Connected to MQTT broker");

  containerName = await getContainerName();

  // Subscribe to request topics
  mqttClient.subscribe(`${serviceId}/clinics/#`, (err) => {
    if (err) return console.error("Failed to subscribe to request topic");
    console.log(`Subscribed to ${serviceId}/clinics/#`);
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

	mqttClient.subscribe(serviceId + "/subscriptions/#", (err) => {
		if (err) return console.error("Failed to subscribe to request topic");
		console.log(`Subscribed to subscriptions/#`);
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
      "Invalid topic. Expected format: <instanceId>/<endpoint>/<action>",
    );
    return;
  }
  const endpoint = params[1];
  const action = params[2];
  const payload = JSON.parse(message.toString());
  payload.action = action;
  const data = payload.data;

  // handle requests
  switch (endpoint) {
    case "clinics": {
      switch (action) {
        case "get": {
          let res;
          // TODO project only relevant fields
          if (data.clinicId) {
            res = await clinics
              .aggregate([
                { $match: { _id: new ObjectId(data.clinicId) } },
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

          publishResponse(payload.reqId, res);
        }
      }
    }
    case "appointments": {
      if (!action) {
        console.error("Invalid query:");
        console.log(payload);
        break;
      }

      if (data.doctorId) payload.data.doctorId = new ObjectId(data.doctorId);
      if (data.userId) payload.data.userId = new ObjectId(data.userId);

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

	case "subscriptions": {
		if (!action || !data.userId || !data.doctorId) {
			console.error("Invalid query:");
			console.log(payload);
			break;
		}
		switch(action) {
			case "sub":
				subscribeToDoctorCalendar(payload);
				break;
			case "unsub":
				unsubscribeFromDoctorCalendar(payload);
				break;
		}
	}
  }
});

// TODO: explicitly close connections

async function handleAppointmentsRequest(payload: any) {
  let slot;

  switch (payload.action) {
    case "get":
      if (!payload.data.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        break;
      }
      const doctorSlots = await slots
        .find(
          { doctorId: payload.data.doctorId },
          { projection: { _id: 0, doctorId: 0 } },
        )
        .toArray();

      const doctor = await doctors.findOne({ _id: payload.data.doctorId });
      const clinic = await clinics.findOne({ _id: doctor?.clinic });
      if (!doctor || !clinic) {
        publishResponse(payload.reqId, {
          message: "Could not fetch doctor data for slot",
        });
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

      publishResponse(payload.reqId, res);
      break;

    case "book": // book a slot
      if (!payload.data.startTime || !payload.data.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        break;
      }

      payload.data.startTime = new Date(payload.data.startTime);
      slot = await slots.findOne({
        doctorId: payload.data.doctorId,
        startTime: payload.data.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        publishResponse(payload.reqId, {
          message: "Error: Slot does not exist",
        });
        return;
      }
      if (slot.isBooked) {
        console.error("Slot already booked");
        console.log(payload);
        console.log(slot);
        publishResponse(payload.reqId, {
          message: "Error: Slot already booked",
        });
        return;
      }

      slot.isBooked = true;
      slot.bookedBy = payload.data.userId;
      await slots.updateOne(
        { _id: slot._id },
        { $set: { isBooked: true, bookedBy: payload.data.userId } },
      );

      publishResponse(payload.reqId, { message: "Slot successfully booked" });

      // send live update to open calendars
      mqttClient.publish(
        `appointments/${payload.data.doctorId}`,
        JSON.stringify(slot),
      );

	  // Notify the doctor that a booking has been confirmed
      mqttClient.publish(
        "notifications/doctor",
        JSON.stringify({
          timestamp: new Date(),
          reqId: uniqid(),
          data: {
            userId: payload.data.doctorId,
            emailMessage: {
              subject: "Booking Confirmed",
              text: `A booking has been confirmed for ${payload.data.startTime}`,
              html: `<p>A booking has been confirmed for ${payload.data.startTime}</p>`,
            },
          },
        }),
      );
      console.log(`Slot successfully booked: ${payload.data.startTime}`);
      break;

    case "cancel": // cancel a slot
      if (!payload.data.startTime || !payload.data.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        break;
      }

      payload.data.startTime = new Date(payload.data.startTime);
      slot = await slots.findOne({
        doctorId: payload.data.doctorId,
        startTime: payload.data.startTime,
      });
      if (!slot) {
        console.error("Slot does not exist");
        publishResponse(payload.reqId, {
          message: "Error: Slot does not exist",
        });
        return;
      }
      if (!slot.isBooked) {
        console.error("Slot not booked");
        console.log(payload);
        console.log(slot);
        publishResponse(payload.reqId, {
          message: "Error: Cannot cancel a non-booked slot",
        });
        return;
      } else if (!slot.bookedBy.equals(payload.data.userId)) {
        console.error("Slot booked by someone else");
        console.log(payload);
        console.log(slot);
        console.log(slot.bookedBy);
        console.log(payload.data.userId);
        publishResponse(payload.reqId, {
          message: "Error: Cannot cancel someone else's slot",
        });
        return;
      }

      slot.isBooked = false;
      slot.bookedBy = null;

      await slots.updateOne(
        { _id: slot._id },
        { $set: { isBooked: false, bookedBy: null } },
      );
      publishResponse(payload.reqId, {
        message: "Booking successfully cancelled",
      });
      mqttClient.publish(
        `appointments/${payload.data.doctorId}`,
        JSON.stringify(slot),
      );

      // Notify the doctor that a booking has been cancelled
      mqttClient.publish(
        "notifications/doctor",
        JSON.stringify({
          timestamp: new Date(),
          reqId: uniqid(),
          data: {
            userId: payload.data.doctorId,
            emailMessage: {
              subject: "Booking Cancelled by Patient",
              text: `A booking has been cancelled by patient for ${payload.data.startTime}`,
              html: `<p>A booking has been cancelled by patient for ${payload.data.startTime}</p>`,
            },
          },
        }),
      );

      console.log(`Booking successfully cancelled: ${payload.data.startTime}`);
      break;

	case "cancelByDoc": // cancel a slot by doctor
		if(!payload.data.startTime || !payload.data.doctorId) {
			console.error("Invalid query:");
			console.log(payload);
			break;
		}
		cancelAppointmentByDoctor(payload);
		break;

    case "getDocDate": // get all booked slots for a doctor on a specific day
      if (!payload.data.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        publishResponse(payload.reqId, { message: "Invalid request" });
        break;
      }

      getAppointmentsForDoctorOnDate(payload);
      break;

    case "getDocUpcoming":
      if (!payload.data.doctorId) {
        console.error("Invalid query:");
        console.log(payload);
        publishResponse(payload.reqId, { message: "Invalid request" });
        break;
      }

      getAppointmentsForDoctorUpcoming(payload);
      break;

    case "getDocPatient":
      if (!payload.data.doctorId || !payload.data.patientName) {
        console.error("Invalid query:");
        console.log(payload);
        publishResponse(payload.reqId, { error: "Invalid request" });
        break;
      }

      getAppointmentsForDoctorPerPatient(payload);
      break;

    case "getUser":
      console.log(payload.data.userId);

      if (!payload.data.userId) {
        console.error("Invalid query");
        console.log(payload);
        publishResponse(payload.reqId, { message: "Invalid request" });
        break;
      }

      getAppointmentsForUser(payload);
      break;

    default:
      console.error("Invalid action");
      return;
  }
}

async function cancelAppointmentByDoctor(payload: any) {
	payload.data.startTime = new Date(payload.data.startTime);
	let slot = await slots.findOne({
		doctorId: payload.data.doctorId,
		startTime: payload.data.startTime,
	});
	if (!slot) {
		console.error("Slot does not exist");
		publishResponse(payload.reqId, {
			error: "Error: Slot does not exist",
		});
		return;
	}
	if (!slot.isBooked) {
		console.error("Slot not booked");
		console.log(payload);
		console.log(slot);
		publishResponse(payload.reqId, {
			message: "Error: Cannot cancel a non-booked slot",
		});
		return;
	}

	const userId = slot.bookedBy;

	slot.isBooked = false;
	slot.bookedBy = null;

	await slots.updateOne(
		{ _id: slot._id },
		{ $set: { isBooked: false, bookedBy: null } },
	);
	publishResponse(payload.reqId, {
		message: "Booking successfully cancelled",
	});
	mqttClient.publish(
		`appointments/${payload.data.doctorId}`,
		JSON.stringify(slot),
	);

	// Notify the user that a booking has been cancelled
	mqttClient.publish(
		"notifications/user",
		JSON.stringify({
			timestamp: new Date(),
			reqId: uniqid(),
			data: {
				userId: userId,
				emailMessage: {
					subject: "Booking Cancelled by Doctor",
					text: `Your booking has been cancelled by doctor for ${payload.data.startTime}\nIf you have any questions, please contact the clinic.`,
					html: `<p>Your booking has been cancelled by doctor for ${payload.data.startTime}</p><p>If you have any questions, please contact the clinic.</p>`,
				},
			},
		}),
	);

	console.log(`Booking successfully cancelled by doctor: ${payload.data.startTime}`);
}

async function getAllDoctors(payload: any) {
  let allDoctors = await doctors
    .aggregate([
      { $match: { _id: { $exists: true } } },
      {
        $lookup: {
          from: "clinics",
          localField: "clinic",
          foreignField: "_id",
          as: "clinic",
        },
      },
      {
        $unwind: "$clinic",
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          clinic: {
            _id: "$clinic._id",
            name: "$clinic.name",
          },
        },
      },
    ])
    .toArray();
  publishResponse(payload.reqId, allDoctors);
}

async function handleSlotRequest(payload: any) {
  if (!payload.data.doctorId || !payload.data.body.startDate) {
    publishResponse(payload.reqId, { message: "Invalid request" });
    return;
  }

  const startDate = new Date(Number(payload.data.body.startDate));
  const doctorId = new ObjectId(payload.data.doctorId);

  const doctor = await doctors.findOne({_id: doctorId});
  if(!doctor){
	publishResponse(payload.reqId, { message: "Doctor not found" });
	return;
  }

  // Check if the start time is before the current timme
  if (payload.data.body.startDate <= new Date()) {
    publishResponse(payload.reqId, { message: "Invalid time range" });
    return;
  }

  // Check if the time is between 8 am and 8 pm
  if (startDate.getHours() < 8 || startDate.getHours() > 20) {
    publishResponse(payload.reqId, { message: "Invalid time range" });
    return;
  }

  let endDate;

  if (payload.data.body.endDate) {
    endDate = new Date(Number(payload.data.body.endDate));

    // Check if the start time is before the end time
    if (payload.data.body.startDate >= payload.data.body.endDate) {
      publishResponse(payload.reqId, { message: "Invalid time range" });
      return;
    }

    // Check if the start time is before the current time
    if (payload.data.body.startDate <= new Date()) {
      publishResponse(payload.reqId, { message: "Invalid time range" });
      return;
    }

    // Check if start time and end time are in the same day
    if (startDate.getDate() != endDate.getDate()) {
      publishResponse(payload.reqId, { message: "Invalid time range" });
      return;
    }

    // Check if the slot already exists
    const slotExists = await slots.findOne({
      doctorId: doctorId,
      startTime: startDate,
      endTime: endDate,
    });
    if (slotExists) {
      publishResponse(payload.reqId, { message: "Slot already exists" });
      return;
    }

    // Check if the slot overlaps with another slot
    const overlappingSlot = await slots.findOne({
      doctorId: doctorId,
      startTime: { $lt: endDate },
      endTime: { $gt: startDate },
    });
    if (overlappingSlot) {
      publishResponse(payload.reqId, {
        message: "Slot overlaps with another slot",
      });
      return;
    }

    // Check if start time is within doctor's working hours (8am - 8pm)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    if (startHour < 8 || endHour > 20) {
      publishResponse(payload.reqId, { message: "Slot outside working hours" });
      return;
    }
  }

  switch (payload.action) {
    case "create":
      if (!endDate) {
        publishResponse(payload.reqId, { message: "Invalid request" });
        return;
      }
      createSlot(payload, doctorId, startDate, endDate);
      break;
    case "delete":
      deleteSlot(payload, doctorId, startDate);
      break;
    case "edit":
      if (!endDate) {
        publishResponse(payload.reqId, { message: "Invalid request" });
        return;
      }
      editSlot(payload, doctorId, startDate, endDate);
      break;
  }
}

async function createSlot(payload: any, doctorId: ObjectId, startDate: Date, endDate: Date) {
	const slot = {
		doctorId: doctorId,
		startTime: startDate,
		endTime: endDate,
		bookedBy: null,
		test: true,
	};
	// Notify the user that a new slot has been created
	mqttClient.publish(
		"notifications/subscription/slotCreated",
		JSON.stringify({
			timestamp: new Date(),
			reqId: uniqid(),
			data: {
				doctorId: doctorId,
				startTime: startDate,
				endTime: endDate,
				emailMessage: {
					subject: "Booking Cancelled by Doctor",
					text: `Your booking has been cancelled by doctor for ${payload.data.startTime}\nIf you have any questions, please contact the clinic.`,
					html: `<p>Your booking has been cancelled by doctor for ${payload.data.startTime}</p><p>If you have any questions, please contact the clinic.</p>`,
				},
			},
		}),
	);
	await slots.insertOne(slot);
	publishResponse(payload.reqId, { message: "Slot created" });
}

async function deleteSlot(payload: any, doctorId: ObjectId, startDate: Date) {
  const slot = await slots.findOne({
    doctorId: doctorId,
    startTime: startDate,
  });

  // Check if the slot exists
  if (!slot) {
    publishResponse(payload.reqId, { message: "Slot not found" });
    return;
  }

  await slots.deleteOne({ _id: slot._id });
  publishResponse(payload.reqId, { message: "Slot deleted" });
}

async function editSlot(
  payload: any,
  doctorId: ObjectId,
  startDate: Date,
  endDate: Date,
) {
  if (!payload.data.body.oldStartDate) {
    publishResponse(payload.reqId, { message: "Invalid request" });
    return;
  }

  const oldStartDate = new Date(Number(payload.data.body.oldStartDate));

  // Find the slot to edit
  const slot = await slots.findOne({
    doctorId: doctorId,
    startTime: oldStartDate,
  });
  if (!slot) {
    publishResponse(payload.reqId, { message: "Slot not found" });
    return;
  }

  // Check if the slot is booked
  if (slot.isBooked || slot.bookedBy) {
    publishResponse(payload.reqId, {
      message: "Unable to update, slot is booked",
    });
    return;
  }

  // Edit the slot
  slot.startTime = startDate;
  slot.endTime = endDate;
  await slots.updateOne(
    { _id: slot._id },
    { $set: { startTime: startDate, endTime: endDate } },
  );
  publishResponse(payload.reqId, { message: "Slot edited" });
}

async function getAppointmentsForDoctorOnDate(payload: any) {
  const doctorId = new ObjectId(payload.data.doctorId);
  const date = new Date(payload.data.date);

  // Set the start of the day (00:00:00)
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));

  // Set the end of the day (23:59:59)
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const dateAppointments = await slots
    .aggregate([
      {
        $match: {
          doctorId: doctorId,
          startTime: { $gte: startOfDay, $lt: endOfDay },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "bookedBy",
          foreignField: "_id",
          as: "patientName",
        },
      },
      {
        $unwind: "$patientName",
      },
      {
        $project: {
          startTime: 1,
          endTime: 1,
          doctorId: 1,
          bookedBy: 1,
          patientName: "$patientName.name",
        },
      },
      {
        $sort: { startTime: 1 },
      },
    ])
    .toArray();

  publishResponse(payload.reqId, dateAppointments);
}

async function getAppointmentsForDoctorUpcoming(payload: any) {
  const doctorId = new ObjectId(payload.data.doctorId);
  const startDate = new Date();

  const upcomingAppointments = await slots
    .aggregate([
      {
        $match: {
          doctorId: doctorId,
          startTime: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "bookedBy",
          foreignField: "_id",
          as: "patientName",
        },
      },
      {
        $unwind: "$patientName",
      },
      {
        $project: {
          startTime: 1,
          endTime: 1,
          doctorId: 1,
          bookedBy: 1,
          patientName: "$patientName.name",
        },
      },
      {
        $sort: { startTime: 1 },
      },
      {
        $limit: 200,
      },
    ])
    .toArray();

  publishResponse(payload.reqId, upcomingAppointments);
}

async function getAppointmentsForDoctorPerPatient(payload: any) {
  const reqId = payload.reqId;
  const doctorId = new ObjectId(payload.data.doctorId);
  const patientName = payload.data.patientName;
  const patients = await users.find({ name: patientName }).toArray();
  if (patients === null || patients.length === 0) {
    publishResponse(reqId, { error: "Patient not found" });
    return;
  }
  const patientIds = patients.map((patient) => patient._id);

  const patientAppointments = await slots
    .find({
      doctorId: doctorId,
      bookedBy: { $in: patientIds },
    })
	.sort({ startTime: 1 })
    .toArray();

	console.log(patientAppointments);

  const appointmentsWithNames = patientAppointments.map((appointment) => {
    appointment.patientName = patientName;
    return appointment;
  });

  publishResponse(reqId, appointmentsWithNames);
}

async function getAppointmentsForUser(payload: any) {
  const reqId = payload.reqId;
  const userId = new ObjectId(payload.data.userId);
  const userAppointments = await slots
    .aggregate([
      {
        $match: {
          bookedBy: userId,
          startTime: { $gte: new Date() },
        },
      },
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $unwind: "$doctor",
      },
      {
        $project: {
          startTime: 1,
          endTime: 1,
          bookedBy: 1,
          doctor: {
            _id: "$doctor._id",
            name: "$doctor.name",
          },
        },
      },
      {
        $sort: { startTime: 1 },
      },
    ])
    .toArray();

  publishResponse(reqId, userAppointments);
}


async function subscribeToDoctorCalendar(payload: any) {
	const userId = new ObjectId(payload.data.userId);
	const doctorId = new ObjectId(payload.data.doctorId);

	const doctor = await doctors.findOne({ _id: doctorId });
	if (!doctor) {
		publishResponse(payload.reqId, { message: "Doctor not found" });
		return;
	}

	const user = await users.findOne({ _id: userId });
	if (!user) {
		publishResponse(payload.reqId, { message: "User not found" });
		return;
	}

	// Check if user is already subscribed to the calendar
	if(doctor.subscribers?.some((subscriber: ObjectId) => subscriber.toString() === userId.toString())) {
		publishResponse(payload.reqId, { message: "Already subscribed to this calendar" });
		return;
	}

	// Add user to the list of subscribers
	let newSubscribersList = doctor.subscribers || [];
	newSubscribersList.push(userId);

	try {
		// Update the list of subscribers
		await doctors.updateOne(
			{_id: doctorId},
			{ $set: { subscribers: newSubscribersList } }
		)
	} catch (err){
		console.log(err);
		publishResponse(payload.reqId, { message: "An error occurred while subscribing to a calendar" })
		return;
	}

	const message = `Subscribed to ${doctor.name}'s calendar`;

	publishResponse(payload.reqId, { message });
}

async function unsubscribeFromDoctorCalendar(payload: any){
	const userId = new ObjectId(payload.data.userId);
	const doctorId = new ObjectId(payload.data.doctorId);

	const doctor = await doctors.findOne({ _id: doctorId });
	if (!doctor) {
		publishResponse(payload.reqId, { message: "Doctor not found" });
		return;
	}

	const user = await users.findOne({ _id: userId });
	if (!user) {
		publishResponse(payload.reqId, { message: "User not found" });
		return;
	}

	// Check if user is already unsubscribed from the calendar
	if(!doctor.subscribers?.some((subscriber: ObjectId) => subscriber.toString() === userId.toString())) {
		publishResponse(payload.reqId, { message: "Cannot unsubscribe from a calendar you are not subscribed to" });
		return;
	}

	// Remove the user from the list of subscribers
	let oldSubscribersList = doctor.subscribers || [];
	const newSubscribersList = oldSubscribersList.filter((subscriber: ObjectId) => subscriber.toString() !== userId.toString());

	try {
		// Update the list of subscribers
		await doctors.updateOne(
			{_id: doctorId},
			{ $set: { subscribers: newSubscribersList } }
		)
	} catch (err){
		console.log(err);
		publishResponse(payload.reqId, { message: "An error occurred while unsubscribing from a calendar" })
		return;
	}

	const message = `Unsubscribed from ${doctor.name}'s calendar`;

	publishResponse(payload.reqId, { message });
}