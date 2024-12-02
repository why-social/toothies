export interface Slots {
  date: Date;
  events: Array<Slot>;
}

export interface Slot {
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}
