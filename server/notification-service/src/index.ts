import express, {Request, Response} from 'express';
import cors from 'cors';
const app = express();
const port = 3002;

app.use(cors());

app.get('/notification', (req: Request, res: Response) => {
  res.send('Notification Service');
});

app.listen(port, () => {
  console.log(`Notification service listening at http://localhost:${port}`);
});
