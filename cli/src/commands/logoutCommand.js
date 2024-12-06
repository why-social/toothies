import { Command } from 'commander';
import fs from "fs";

const tokenPath = './.env';

const logoutCommand = new Command('logout')
.description('Logout from Toothies')
.action((options) => {
	// Remove the token from the .env file
	fs.readFile(tokenPath, 'utf8', (err, data) => {
        if (err) {
            return console.error('Error reading the .env file:', err);
        }

		let tokenRemoved = false;

        // Remove the ACCESS_TOKEN line
        const updatedData = data.split('\n').filter(line =>{
			if(line.startsWith('ACCESS_TOKEN=')) {
				tokenRemoved = true;
				return false;
			} else {
				return true;
			}
		}).join('\n');

        // Write the updated content back to the .env file
        fs.writeFile(tokenPath, updatedData, (err) => {
            if (err) {
                console.error('Error removing the access token from file:', err);
            }
        });

		process.env.ACCESS_TOKEN = undefined;

		if (tokenRemoved) {
			console.log('Logged out successfully');
		} else {
			console.log('Already logged out');
		}
    });
});

export default logoutCommand;