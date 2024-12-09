import { Command } from 'commander';
import chalk from 'chalk';
import createSlot from "./createSlotCommand.js";
import deleteSlot from './deleteSlotCommand.js';

const slotsCommand = new Command('slots')
	.description(`Allows you to manage slots ${chalk.yellow('(requires to be logged in)')}`);

slotsCommand.addCommand(createSlot);
slotsCommand.addCommand(deleteSlot);

export default slotsCommand;