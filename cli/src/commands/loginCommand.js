import { Command } from 'commander';
import fs from "fs";
import chalk from "chalk";

const tokenPath = './.env';

const loginCommand = new Command('login')
.description('Login to Toothies')
.requiredOption('-e, --email <type>', `Your email ${chalk.dim('(required)')}`)
.requiredOption('-p, --password <type>', `Your password ${chalk.dim('(required)')}`)
.action((options) => {
	//TODO implement the login logic (call an API, etc.)

	// Remove the old token
	fs.readFileSync(tokenPath, 'utf8', (err, data) => {
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

	const accessToken = "access_token";

	const envToken = `\nACCESS_TOKEN=${accessToken}`;
	fs.appendFile(tokenPath, envToken, (err) => {
		if (err) {
			console.error('Error saving the access token to file:', err);
		}
	});
	console.log('Logged in successfully');
});

export default loginCommand;