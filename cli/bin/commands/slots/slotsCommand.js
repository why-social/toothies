import { Command } from 'commander';
import createSlot from "./createSlotCommand.js";

const slotsCommand = new Command('slots')
	.description('Allows you to manage slots');

slotsCommand.addCommand(createSlot);


export default slotsCommand;