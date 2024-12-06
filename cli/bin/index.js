#!/usr/bin/env node

import { program } from "commander";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

if (process.env.API_URL === undefined)
	process.env.API_URL = "http://localhost:3000";

import loginCommand from "../src/commands/loginCommand.js";
import logoutCommand from "../src/commands/logoutCommand.js";
import slotsCommand from "../src/commands/slots/slotsCommand.js";


program
	.version("0.0.1")
	.description("Doctor CLI")

program.hook('preAction', () => {
	updateAuthToken();
});

program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(slotsCommand);

program.parse(process.argv);

function updateAuthToken(){
	// Check if .env file is present
	if (!fs.existsSync('./.env')) {
		process.env.ACCESS_TOKEN = undefined;
		return;
	}

	// Read the .env file
	try{
		dotenv.config();
		if(process.env.ACCESS_TOKEN?.length == 0) {
			process.env.ACCESS_TOKEN = undefined;
		}
	} catch (err){
		console.error('Error reading .env file:', err);
	}
}