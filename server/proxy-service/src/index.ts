import express, {Request, Response} from 'express';
import cors from 'cors';
const app = express();
const port = 3001;

let counter:number = 1;

app.use(cors());

app.get('/proxy', (req: Request, res: Response) => {
  res.send(`Proxy service response #${counter}`);
  counter++;
});

app.listen(port, () => {
  console.log(`Proxy service listening at http://localhost:${port}`);
});