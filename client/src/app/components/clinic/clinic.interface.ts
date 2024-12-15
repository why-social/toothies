import { Location } from '../../types/location.interface';
import { Doctor } from '../doctor/doctor.interface';

export interface Clinic {
  name: string;
  _id: string;
  location: Location;
  doctors: Array<Doctor>;
}

export interface Clinic {
  name: string;
  _id: string;
  location: Location;
}

export interface Clinic {
  name: string;
  _id: string;
}

export interface Clinic {
  _id: string;
}
