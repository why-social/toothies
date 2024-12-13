import { Clinic } from '../clinic/clinic.interface';

export interface Doctor {
  name: string;
  _id: string;
  type: string;
  clinic: Clinic;
}
