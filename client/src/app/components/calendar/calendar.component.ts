import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CalendarSlot, CalendarSlots } from './calendar.slots.interface';
import { getToken } from '../../views/authentication/guard';

@Component({
  selector: 'calendar',
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
})
export class CalendarComponent implements OnChanges {
  private static readonly DAYS_PER_WEEK: number = 5;

  @Output() openEvent = new EventEmitter<CalendarSlot>();
  @Input() slots!: Array<CalendarSlot>;

  private readonly startDate: Date;
  private slotsMap: Map<number, Array<CalendarSlot>>;

  protected readonly today: Date;

  protected activeSlots!: Array<CalendarSlots>;
  protected hours: Array<number>;
  protected month!: string;
  protected week!: string;
  protected year!: number;

  constructor() {
    this.slotsMap = new Map();

    this.today = new Date();
    this.hours = Array.from({ length: 12 }, (_, a) => a + 8);

    let day = this.today.getDay();
    let diff = this.today.getDate() - day + (day == 0 ? -6 : 1); // americans...

    this.startDate = new Date();
    this.startDate.setDate(diff);
    this.startDate.setHours(0);
    this.startDate.setMinutes(0);
    this.startDate.setSeconds(0);
    this.startDate.setMilliseconds(0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slots']) {
      this.slotsMap.clear();

      for (const slot of this.slots) {
        if (
          !(
            slot.startTime.getUTCHours() < this.hours[0] - 1 || // Sweden is UTC + 1
            slot.endTime.getUTCHours() >= this.hours[this.hours.length - 1]
          )
        ) {
          const date: Date = new Date(slot.startTime);

          date.setDate(slot.startTime.getDate());
          date.setHours(0);
          date.setMinutes(0);
          date.setSeconds(0);
          date.setMilliseconds(0);

          let daySlots: Array<CalendarSlot> | undefined =
            this.slotsMap.get(date.getTime()) || [];

          daySlots.push(slot);
          this.slotsMap.set(date.getTime(), daySlots);
        }
      }

      this.updateCalendarDataFor();
    }
  }

  private updateCalendarDataFor(startDate?: Date | null | undefined) {
    if (!startDate) {
      startDate = this.startDate;
    }

    this.activeSlots = new Array(CalendarComponent.DAYS_PER_WEEK);
    for (let index = 0; index < CalendarComponent.DAYS_PER_WEEK; index++) {
      const date: Date = new Date(startDate);

      date.setDate(startDate.getDate() + index);
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      this.activeSlots[index] = {
        date: date,
        events: this.slotsMap.get(date.getTime()) || [],
      };
    }

    let startMonth = this.activeSlots[0].date.toLocaleString('default', {
      month: 'long',
    });
    let endMonth = this.activeSlots[
      CalendarComponent.DAYS_PER_WEEK - 1
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
        this.activeSlots[CalendarComponent.DAYS_PER_WEEK - 1].date,
      );

      if (startWeek == endWeek) {
        this.week = startWeek;
        this.year = this.activeSlots[0].date.getFullYear();
      } else {
        this.week = startWeek + ' - ' + endWeek;
        this.year =
          this.activeSlots[
            CalendarComponent.DAYS_PER_WEEK - 1
          ].date.getFullYear();
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

  public calculateTop(slot: CalendarSlot) {
    const date: Date = new Date(slot.startTime);

    date.setHours(8);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return this.normalizedSince(date, slot.startTime) + '%';
  }

  public calculateBottom(slot: CalendarSlot) {
    const date: Date = new Date(slot.startTime);

    date.setHours(20);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return this.normalizedSince(slot.endTime, date) + '%';
  }

  protected goBack() {
    const newStart: Date = new Date(this.activeSlots[0].date);
    newStart.setDate(this.activeSlots[0].date.getDate() - 7);

    if (newStart < this.startDate) {
      return;
    }

    this.updateCalendarDataFor(newStart);
  }

  protected goForward() {
    const newStart: Date = new Date(this.activeSlots[0].date);
    newStart.setDate(this.activeSlots[0].date.getDate() + 7);

    this.updateCalendarDataFor(newStart);
  }

  protected canModify(slot: CalendarSlot) {
    return !slot.bookedBy || slot.bookedBy == getToken(true).userId;
  }
}
