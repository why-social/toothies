import { Clinic } from './clinic';

export interface PopulatedDoctor {
  name: string;
  _id: string;
  type: string;
  clinic: Clinic; // clinic document
}

export interface Doctor {
  name: string;
  _id: string;
  type: string;
  clinic: string; // clinic identifier
}
