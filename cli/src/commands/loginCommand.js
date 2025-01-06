import { Command } from 'commander';
import fs from "fs";
import chalk from "chalk";
import axios from 'axios';

const tokenPath = './.env';

const loginCommand = new Command('login')
.description('Login to Toothies')
.requiredOption('-e, --email <type>', `Your email ${chalk.dim('(required)')}`)
.requiredOption('-p, --password <type>', `Your password ${chalk.dim('(required)')}`)
.action(async (options) => {
	// Remove the old token
	await fs.readFile(tokenPath, 'utf8', (err, data) => {
		if (err) {
			return console.error('Error reading the .env file:', err);
		}

		// Remove the ACCESS_TOKEN line
		const updatedData = data.split('\n').filter(line => !line.startsWith('ACCESS_TOKEN=')).join('\n');

		// Write the updated content back to the .env file
		fs.writeFile(tokenPath, updatedData, (err) => {
			if (err) {
				console.error('Error removing the access token from file:', err);
			}
		});
	});

	// Make a request to the login endpoint
	let accessToken;
	try{
		const res = await axios.post(`${process.env.API_URL}/auth/doctorLogin`, {
			email: options.email,
			password: options.password
		});
		if(res.data?.message){ // If there is a message in the response, it means there was an error
			console.error(chalk.red('Error logging in: ' + res.data.message));
			return;
		}
		accessToken = res.data.token;
	} catch (error) {
		console.error("An error occurred while logging in");
		return;
	}

	const envToken = `\nACCESS_TOKEN=${accessToken}`;
	fs.appendFile(tokenPath, envToken, (err) => {
		if (err) {
			console.error('Error saving the access token to file:', err);
		}
	});
	console.log('Logged in successfully');
});

export default loginCommand;