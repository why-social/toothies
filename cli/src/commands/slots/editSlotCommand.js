import { Command } from 'commander';
import chalk from "chalk";
import axios from "axios";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const editSlot = new Command("edit")
.description(`Update a slot with specified date and time`)
.requiredOption("-od, --oldDate <date>", `Date of the existing slot in the format YYYY-MM-DD ${chalk.dim("(required)")}`)
.requiredOption("-os, --oldStartTime <time>", `Start time of the existing slot in the format HH:MM ${chalk.dim("(required)")}`)
.requiredOption("-d, --date <date>", `New date of the slot in the format YYYY-MM-DD ${chalk.dim("(required)")}`)
.requiredOption("-s, --startTime <time>", `New start time of the slot in the format HH:MM ${chalk.dim("(required)")}`)
.requiredOption("-e, --endTime <time>", `New end time of the slot in the format HH:MM ${chalk.dim("(required)")}`)
.action(async (options) => {
	// Check if the user is logged in
	if (!process.env.ACCESS_TOKEN) return console.error("Unauthorized");

	// Check if the date is in the correct format
	if (!dateRegex.test(options.oldDate)) return console.error("Date should be in the format YYYY-MM-DD");
	if (!dateRegex.test(options.date)) return console.error("New date should be in the format YYYY-MM-DD");
	if (!timeRegex.test(options.startTime)) return console.error("Time should be in the format HH:MM");
	if (!timeRegex.test(options.startTime) || !timeRegex.test(options.endTime)) return console.error("New time should be in the format HH:MM");

	// Convert the date and time to a single datetime string
	let oldStartDate = new Date(`${options.oldDate}T${options.oldStartTime}:00.000Z`);
	let startDate = new Date(`${options.date}T${options.startTime}:00.000Z`);
	let endDate = new Date(`${options.date}T${options.endTime}:00.000Z`);

	// Check if the new start time is before the new end time
	if (startDate >= endDate) return console.error("Start time should be before end time");

	// Check if the new start time is before the current time
	if (startDate <= new Date()) return console.error("Start time should be in the future");

	// Check if the start time is at least 8 am
	if (startDate.getHours() < 8) return console.error("Start time should be at least 8 am");

	// Check if the end time is at most 8 pm
	if (endDate.getHours() > 20) return console.error("End time should be at most 8 pm");

	// Convert the dates to milliseconds
	oldStartDate = oldStartDate.getTime();
	startDate = startDate.getTime();
	endDate = endDate.getTime();

	// Make an api call to create a slot and handle the response
	try {
		const res = await axios.patch(`${process.env.API_URL}/slots`,
		{ oldStartDate, startDate, endDate },
		{ headers: 
			{ Authorization: `Bearer ${process.env.ACCESS_TOKEN}` }
		});
		if(res.data?.message) console.log(res.data.message);
	} catch (error) {
		if (error.response && error.response.data) {
			console.error("Error updating the slot:", error.response.data);
		} else {
			console.error("Error updating the slot:", error.message);
		}
	}

});

export default editSlot;