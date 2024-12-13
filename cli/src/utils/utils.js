import axios from 'axios';

export const makeRequest = async (method, url, errorMessage, data) => {
	try {
		const res = await axios({
			method,
			url,
			data,
			headers: {
				Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
			}
		});
		return res;
	} catch (error) {
		if (error.response && error.response.data) {
			console.error(errorMessage, error.response.data);
		} else {
			console.error(errorMessage, error.message);
		}
	}
};

export const getDoctorId = async () => {
	let doctorId = null;

	try {
		doctorId = JSON.parse(atob(process.env.ACCESS_TOKEN.split('.')[1])).userId;
		if(!doctorId) return console.error("Unauthorized");
	} catch (error) {
		console.error("Unauthorized");
	}
	
	return doctorId;
}