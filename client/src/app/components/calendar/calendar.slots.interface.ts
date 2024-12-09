export interface CalendarSlots {
  date: Date;
  events: Array<CalendarSlot>;
}

export interface CalendarSlot {
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}
