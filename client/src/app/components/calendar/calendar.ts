import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Slot, Slots } from './slots';

@Component({
  selector: 'calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
})
export class Calendar implements OnInit {
  private static readonly DAYS_PER_WEEK: number = 5;

  @Output() openEvent = new EventEmitter<Slot>();
  @Input() slots!: Array<Slot>;

  private readonly startDate: Date;
  readonly today: Date;

  hours: Array<number>;
  activeSlots: Array<Slots>;
  month!: string;
  week!: string;
  year!: number;

  constructor() {
    this.today = new Date();
    this.hours = Array.from({ length: 12 }, (_, a) => a + 8);
    this.activeSlots = new Array(Calendar.DAYS_PER_WEEK);

    let day = this.today.getDay();
    let diff = this.today.getDate() - day + (day == 0 ? -6 : 1); // americans...

    this.startDate = new Date();

    this.startDate.setDate(diff);
    this.startDate.setHours(0);
    this.startDate.setMinutes(0);
    this.startDate.setSeconds(0);
    this.startDate.setMilliseconds(0);
  }

  ngOnInit(): void {
    this.updateCalendarDataFor(this.startDate);
  }

  private updateCalendarDataFor(startDate: Date) {
    for (let index = 0; index < Calendar.DAYS_PER_WEEK; index++) {
      const date: Date = new Date(startDate);

      date.setDate(startDate.getDate() + index);
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      this.activeSlots[index] = { date: date, events: [] };
    }

    for (const slot of this.slots) {
      if (
        !(
          slot.endTime < this.activeSlots[0].date ||
          slot.startTime > this.activeSlots[Calendar.DAYS_PER_WEEK - 1].date
        )
      ) {
        for (const slots of this.activeSlots)
          if (slot.startTime.getDate() == slots.date.getDate()) {
            slots.events.push(slot);
          }
      }
    }

    let startMonth = this.activeSlots[0].date.toLocaleString('default', {
      month: 'long',
    });
    let endMonth = this.activeSlots[
      Calendar.DAYS_PER_WEEK - 1
    ].date.toLocaleString('default', { month: 'long' });

    if (startMonth == endMonth) {
      this.month = startMonth;
      this.week = this.getWeekDay(this.activeSlots[0].date);
      this.year = this.activeSlots[0].date.getFullYear();
    } else {
      this.month =
        startMonth.substring(0, Math.min(startMonth.length, 3)) +
        ' - ' +
        endMonth.substring(0, Math.min(endMonth.length, 3));

      const startWeek: string = this.getWeekDay(this.activeSlots[0].date);
      const endWeek: string = this.getWeekDay(
        this.activeSlots[Calendar.DAYS_PER_WEEK - 1].date,
      );

      if (startWeek == endWeek) {
        this.week = startWeek;
        this.year = this.activeSlots[0].date.getFullYear();
      } else {
        this.week = startWeek + ' - ' + endWeek;
        this.year =
          this.activeSlots[Calendar.DAYS_PER_WEEK - 1].date.getFullYear();
      }
    }
  }

  private getWeekDay(date: Date): string {
    var firstOfJan = new Date(date.getFullYear(), 0, 1);
    return String(
      Math.ceil(
        ((date.valueOf() - firstOfJan.valueOf()) / 86400000 +
          firstOfJan.getDay() +
          1) /
          7,
      ),
    );
  }

  private normalizedSince(date1: Date, date2: Date) {
    return (
      ((date2.getTime() - date1.getTime()) / (this.hours.length * 3600000)) *
      100
    );
  }

  public calculateTop(slot: Slot) {
    const date: Date = new Date(slot.startTime);

    date.setHours(8);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return this.normalizedSince(date, slot.startTime) + '%';
  }

  public calculateBottom(slot: Slot) {
    const date: Date = new Date(slot.startTime);

    date.setHours(20);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return this.normalizedSince(slot.endTime, date) + '%';
  }

  public goBack() {
    const newStart: Date = new Date(this.activeSlots[0].date);
    newStart.setDate(this.activeSlots[0].date.getDate() - 7);

    if (newStart < this.startDate) {
      return;
    }

    this.updateCalendarDataFor(newStart);
  }

  public goForward() {
    const newStart: Date = new Date(this.activeSlots[0].date);
    newStart.setDate(this.activeSlots[0].date.getDate() + 7);

    this.updateCalendarDataFor(newStart);
  }
}
