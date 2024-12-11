import { Doctor } from '../doctor/doctor.interface';

export interface CalendarSlots {
  date: Date;
  events: Array<CalendarSlot>;
}

export interface CalendarSlot {
  doctor: Doctor;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}
