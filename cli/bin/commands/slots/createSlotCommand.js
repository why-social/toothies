import { Command } from 'commander';
import chalk from "chalk";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const createSlot = new Command("create")
.description(`Create a new slot with specified date and time\n${chalk.yellow("Requires to be logged in")}`)
.option("-d, --date <date>", "Date of the slot in the format YYYY-MM-DD")
.option("-s, --startTime <time>", "Start time of the slot in the format HH:MM")
.option("-e, --endTime <time>", "End time of the slot in the format HH:MM")
.action((options) => {
	// Check if the date is in the correct format
	if (!dateRegex.test(options.date)) return console.error("Date should be in the format YYYY-MM-DD");
	if (!timeRegex.test(options.startTime) || !timeRegex.test(options.endTime)) return console.error("Time should be in the format HH:MM");

	// Convert the date and time to a single datetime string
	const startDate = new Date(`${options.date}T${options.startTime}:00.000Z`);
	const endDate = new Date(`${options.date}T${options.endTime}:00.000Z`);

	// Check if the start time is before the end time
	if (startDate >= endDate) return console.error("Start time should be before end time");

	// Check if the start time is before the current time
	if (startDate <= new Date()) return console.error("Start time should be in the future");


	//TODO make an api call to create a slot and handle the response

});

export default createSlot;