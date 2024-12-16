import { Command } from 'commander';
import chalk from "chalk";
import axios from "axios";
import { makeRequest } from '../../utils/utils.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const deleteSlot = new Command("delete")
.description(`Delete a slot with specified date and time`)
.requiredOption("-d, --date <date>", `Date of the slot in the format YYYY-MM-DD ${chalk.dim("(required)")}`)
.requiredOption("-s, --startTime <time>", `Start time of the slot in the format HH:MM ${chalk.dim("(required)")}`)
.action(async (options) => {
	// Check if the user is logged in
	if (!process.env.ACCESS_TOKEN) return console.error("Unauthorized");

	// Check if the date is in the correct format
	if (!dateRegex.test(options.date)) return console.error("Date should be in the format YYYY-MM-DD");
	if (!timeRegex.test(options.startTime)) return console.error("Time should be in the format HH:MM");

	// Convert the date and time to a single datetime string
	let startDate = new Date(`${options.date}T${options.startTime}:00.000Z`);

	// Check if the time is between 8 am and 8 pm
	if (startDate.getHours() < 8 || startDate.getHours() > 20) return console.error("Time should be between 8 am and 8 pm");

	// Convert the dates to milliseconds
	startDate = startDate.getTime();

	// Make an api call to delete a slot and handle the response
	const res = await makeRequest('delete', `${process.env.API_URL}/slots`, "Error deleting the slot:", { startDate });
	if(res.data?.message) console.log(res.data.message);
});

export default deleteSlot;