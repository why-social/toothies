import { Location } from '../../types/location.interface';
import { Doctor } from '../doctor/doctor.interface';

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
}
