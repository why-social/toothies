import { Location } from './location';
import { Doctor } from './doctor';

export interface PopulatedClinic {
  name: string;
  location: Location;
  doctors: Array<Doctor>; // doctor documents
}

export interface Clinic {
  name: string;
  location: Location;
  doctors: Array<string>; // doctor identifiers
}
