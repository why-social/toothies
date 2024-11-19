import express, {Request, Response} from 'express';
import cors from 'cors';
const app = express();
const port = 3001;

let counter:number = 1;

app.use(cors());

app.get('/proxy', (req: Request, res: Response) => {
	const timeAfterReq = Date.now();
	const timeDiff = timeAfterReq - Number(req.headers['x-time-before-req']);
	res.send(`Proxy service response #${counter}<br>Time taken: ${timeDiff}ms`);
	counter++;

	console.log('Proxy service response sent\n');
});

app.listen(port, () => {
	console.log(`Proxy service listening at http://localhost:${port}`);
});