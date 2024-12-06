import jwt from 'jsonwebtoken';

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "TEST SECRET KEY SHOULD BE CHANGED BEFORE PRODUCTION";

const secrets = { JWT_SECRET_KEY };

function createUserToken(id:string) {
	return jwt.sign({
		userId: id,
	},
		JWT_SECRET_KEY, { expiresIn: "48h" }
	);
}

export { createUserToken, secrets };