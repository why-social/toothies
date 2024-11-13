import express, {Request, Response} from 'express';
import cors from 'cors';
const app = express();
const port = 3003;

app.use(cors());

app.get('/account', (req: Request, res: Response) => {
  res.send('Account Service');
});

app.listen(port, () => {
  console.log(`Account service listening at http://localhost:${port}`);
});