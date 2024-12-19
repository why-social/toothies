import { Command, Option } from 'commander';
import chalk from "chalk";
import { makeRequest, getDoctorId } from '../../utils/utils.js';
import ora from "ora";

const spinner = ora({ text: "Loading\n" });

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dateOption = new Option("-d, --date <date>", "Display appointments for a specific date (YYYY-MM-DD)").conflicts(["patient", "upcoming"]);
const patientOption = new Option("-pa, --patient <string>", "Display appointments for a specific patient (full name)").conflicts(["date", "upcoming"]);
const upcomingOption = new Option("-u, --upcoming", "Display all upcoming appointments").conflicts(["date", "patient"]);


const viewAppointments = new Command("view")
.description(`View all appointments for either a specific date, appointments for a week, or all appointments ${chalk.yellow("(requires to be logged in)")}`)
.addOption(dateOption)
.addOption(patientOption)
.addOption(upcomingOption)
.option("-p, --prettify", "Pretty print the output")
.action(async (options) => {
	// Check if the user is logged in
	if (!process.env.ACCESS_TOKEN) return console.error("Unauthorized");

	if (options.date) {
		if (!dateRegex.test(options.date))
			return console.error("Invalid date format. Please use the format YYYY-MM-DD");

		const doctorId = await getDoctorId();
		if (!doctorId) return;

		console.log(chalk.yellow(`Fetching appointments for ${options.date}...`));
		spinner.start();
		let res = await makeRequest("get", `${process.env.API_URL}/doctor/appointments/?date=${options.date}&doctorId=${doctorId}`, "Error fetching appointments:");
		const modifiedDataPrettified = res.data.map((appointment) => {
			return {
				"Start time": new Date(appointment.startTime).toLocaleString(),
				"End time": new Date(appointment.endTime).toLocaleString(),
				"Patient name": !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName
			};
		});
		const modifiedData = res.data.map((appointment) => {
			appointment.patientName = !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName;
			return appointment;
		});
		spinner.stop();

		if(res.data.length == 0)
			return console.log(chalk.yellow("No appointments found for the specified date"));

		if(options.prettify){
			console.table(modifiedDataPrettified, ["Start time", "End time", "Patient name"]);
		} else {
			console.log(modifiedData);
		}
	} else if (options.patient) {
		const doctorId = await getDoctorId();
		if (!doctorId) return;

		console.log(chalk.yellow(`Fetching appointments for ${options.patient}...`));
		spinner.start();
		let res = await makeRequest("get", `${process.env.API_URL}/doctor/appointments/?patientName=${options.patient}&doctorId=${doctorId}`, "Error fetching appointments:");
		if(res.data.error){
			spinner.stop();
			return console.log(chalk.red(res.data.error));
		}
		const modifiedDataPrettified = res.data.map((appointment) => {
			return {
				"Start time": new Date(appointment.startTime).toLocaleString(),
				"End time": new Date(appointment.endTime).toLocaleString(),
				"Patient name": !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName
			};
		});
		const modifiedData = res.data.map((appointment) => {
			appointment.patientName = !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName;
			return appointment;
		});
		spinner.stop();

		if(res.data.length == 0)
			return console.log(chalk.yellow("No appointments found for the specified patient"));

		if(options.prettify){
			console.table(modifiedDataPrettified, ["Start time", "End time", "Patient name"]);
		} else {
			console.log(modifiedData);
		}
	} else if (options.upcoming) {
		const doctorId = await getDoctorId();
		if (!doctorId) return;
		console.log(chalk.yellow("Fetching all upcoming appointments..."));
		spinner.start();
		let res = await makeRequest("get", `${process.env.API_URL}/doctor/appointments/upcoming`, "Error fetching appointments:");
		const modifiedDataPrettified = res.data.map((appointment) => {
			return {
				"Start time": new Date(appointment.startTime).toLocaleString(),
				"End time": new Date(appointment.endTime).toLocaleString(),
				"Patient name": !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName
			};
		});
		const modifiedData = res.data.map((appointment) => {
			appointment.patientName = !appointment.patientName||appointment.patientName.length==0?"N/A": appointment.patientName;
			return appointment;
		});
		spinner.stop();

		if(res.data.length == 0)
			return console.log(chalk.yellow("No appointments found"));

		if(options.prettify){
			console.table(modifiedDataPrettified, ["Start time", "End time", "Patient name"]);
		} else {
			console.log(modifiedData);
		}
	}
});

export default viewAppointments;
