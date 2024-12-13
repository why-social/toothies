import { Doctor } from '../doctor/doctor.interface';

export interface Booking {
  doctor: Doctor;
  start: Date;
  end: Date;
}
