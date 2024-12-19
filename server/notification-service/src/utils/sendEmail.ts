import Mailjet from "node-mailjet";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.MJ_APIKEY_PUBLIC){
	throw new Error("MJ_APIKEY_PUBLIC is not defined");
}
if (!process.env.MJ_APIKEY_PRIVATE){
	throw new Error("MJ_APIKEY_PRIVATE is not defined");
}

const mailjet = Mailjet.apiConnect(
	String(process.env.MJ_APIKEY_PUBLIC),
	String(process.env.MJ_APIKEY_PRIVATE)
)

export function sendEmail(emailAdress: string, name:string, subject: string, text: string, html: string) {
	const request = mailjet
		.post('send', { version: 'v3.1' })
		.request({
			Messages: [{
				From: {
					Email: "noreply.why.social@gmail.com",
					Name: "Toothies Notifications"
				},
				To: [{
					Email: emailAdress,
					Name: name
				}],
				Subject: subject,
				TextPart: text,
				HTMLPart: html
			}]
		});
	
	return new Promise((resolve, reject) => {
		request
			.then((result) => {
				resolve(result.body)
			})
			.catch((err) => {
				reject(err)
			});
	});
}
