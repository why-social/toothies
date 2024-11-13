import express, {Express, Request, Response, NextFunction} from 'express';
import httpProxy from 'http-proxy';
import cors from 'cors';
const app:Express = express();
const port:number = 3000;
const serviceProxy:httpProxy = httpProxy.createProxyServer();

const localIp = "host.docker.internal";

app.use(cors());

app.use("/appointment", (req: Request, res: Response) => {
	serviceProxy.web(req, res, {
		target: `http://${localIp}:3001/appointment`,
		changeOrigin: true,
		secure: true,
		xfwd: true
	});
});

app.use("/notification", (req: Request, res: Response) => {
	serviceProxy.web(req, res, {
		target: `http://${localIp}:3002/notification`,
		changeOrigin: true,
		secure: true,
		xfwd: true
	});
});

app.use("/account", (req: Request, res: Response) => {
	serviceProxy.web(req, res, {
		target: `http://${localIp}:3003/account`,
		changeOrigin: true,
		secure: true,
		xfwd: true
	});
});

app.use('/', (req: Request, res: Response, next: NextFunction) => {res.send('API Gateway')});

app.listen(port, () => {
  console.log(`API Gateway listening at http://localhost:${port}`);
});