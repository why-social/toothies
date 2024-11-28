import { Command } from 'commander';
import fs from "fs";

const tokenPath = './.env';

const loginCommand = new Command('login')
.description('Login to Toothies')
.requiredOption('-u, --username <type>', 'Your username')
.requiredOption('-p, --password <type>', 'Your password')
.action((options) => {
	//TODO implement the login logic (call an API, etc.)

	const accessToken = "access_token";

	console.log('Logged in successfully');

	const envToken = `\nACCESS_TOKEN=${accessToken}`;
    fs.appendFile(tokenPath, envToken, (err) => {
		if (err) {
			console.error('Error saving the access token to file:', err);
		}
    });
});

export default loginCommand;