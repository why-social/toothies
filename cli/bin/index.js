#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import loginCommand from "./commands/loginCommand.js";
import fs from "fs";
import dotenv from "dotenv";

program
	.version("0.0.1")
	.description("Doctor CLI")
	.option("-n, --name <type>", "Add your name")
	.action((options) => {
		updateAuthToken();
		console.log(chalk.blue(`Hey, ${options.name}!`));
		console.log(chalk.yellow(`Token: ${process.env.ACCESS_TOKEN}`));
	});

program.addCommand(loginCommand);

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