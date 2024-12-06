//const jwt = require('jsonwebtoken');
import jwt, { JwtPayload } from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import { secrets } from '../utils/utils';

const JWT_SECRET_KEY = secrets.JWT_SECRET_KEY;

interface AuthenticatedRequest extends Request {
	isAuth?: boolean;
	user?: any;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction):void => {
    const token = req.header('Authorization')?.replace('Bearer ', ''); // Remove 'Bearer ' from token

	req.isAuth = false;

	if(!token){ // If there is no auth token, user is not logged in
		return next();
	}

    try { // jwt.verify will throw an error if token is invalid
        const decoded:Object = jwt.verify(token, JWT_SECRET_KEY); // Verify token
        req.user = decoded; // If token is valid, set user to decoded (user id)
		req.isAuth = true;
    } catch (error) {
        req.isAuth = false;
    }

	next();
};

export { authMiddleware, AuthenticatedRequest };