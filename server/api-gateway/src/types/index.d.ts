import * as express from 'express';

declare global {
	namespace Express {
		interface Request {
			isAuth?: boolean;
			user?: string;
		}
	}
}