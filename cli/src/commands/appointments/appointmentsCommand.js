import { Command } from 'commander';
import chalk from 'chalk';
import cancelAppointment from './cancelAppointmentCommand.js';
import viewAppointments from './viewAppointmentsCommand.js';

const appointmentsCommand = new Command('appointments')
	.description(`Allows you to view and manage appointments ${chalk.yellow('(requires to be logged in)')}`);

appointmentsCommand.addCommand(cancelAppointment);
appointmentsCommand.addCommand(viewAppointments);


export default appointmentsCommand;