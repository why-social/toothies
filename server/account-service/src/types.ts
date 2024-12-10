import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId | string;
  personnummer: string;
  name: string;
  email: string;
  passwordHash: string;
}
