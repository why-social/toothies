import { Location } from './location';
import { Doctor } from './doctor';

export interface PopulatedClinic {
  name: string;
  _id: string;
  location: Location;
  doctors: Array<Doctor>; // doctor documents
}

export interface Clinic {
  name: string;
  _id: string;
  location: Location;
  doctors: Array<string>; // doctor identifiers
}
