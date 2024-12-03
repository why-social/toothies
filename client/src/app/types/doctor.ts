import { Clinic } from './clinic';

export interface PopulatedDoctor {
  name: string;
  doctorId: string;
  type: string;
  clinic: Clinic; // clinic document
}

export interface Doctor {
  name: string;
  doctorId: string;
  type: string;
  clinic: string; // clinic identifier
}
