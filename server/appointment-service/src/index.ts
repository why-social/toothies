import express, {Request, Response} from 'express';
import cors from 'cors';
const app = express();
const port = 3001;

app.use(cors());

app.get('/appointment', (req: Request, res: Response) => {
  res.send("Appointment Service");
});

app.listen(port, () => {
  console.log(`Appointment service listening at http://localhost:${port}`);
});