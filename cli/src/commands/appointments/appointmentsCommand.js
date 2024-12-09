import { Command } from 'commander';
import chalk from 'chalk';
import cancelAppointment from './cancelAppointmentCommand.js';

const appointmentsCommand = new Command('appointments')
	.description(`Allows you to manage appointments ${chalk.yellow('(requires to be logged in)')}`);

appointmentsCommand.addCommand(cancelAppointment);


export default appointmentsCommand;