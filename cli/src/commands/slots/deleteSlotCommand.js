import { Command } from 'commander';
import chalk from "chalk";
import axios from "axios";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const deleteSlot = new Command("delete")
.description(`Delete a slot with specified date and time ${chalk.yellow("(requires to be logged in)")}`)
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

	// Make an api call to create a slot and handle the response
	try {
		const res = await axios.delete(`${process.env.API_URL}/slots`,
		{ data: { startDate }, headers: 
			{ Authorization: `Bearer ${process.env.ACCESS_TOKEN}` }
		});
		if(res.data?.message) console.log(res.data.message);
	} catch (error) {
		if (error.response && error.response.data) {
			console.error("Error deleting the slot:", error.response.data);
		} else {
			console.error("Error deleting the slot:", error.message);
		}
	}

});

export default deleteSlot;