import Mailjet from "node-mailjet";

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
