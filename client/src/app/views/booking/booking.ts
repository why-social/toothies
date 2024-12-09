import { Component, inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { CalendarSlot } from '../../components/calendar/calendar.slots.interface';
import { BookingDialogComponent } from '../../components/booking/dialog/booking.dialog';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Injectable({ providedIn: 'root' })
@Component({
  templateUrl: './booking.html',
  styleUrl: './booking.css',
  imports: [CalendarComponent],
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  slots: Array<CalendarSlot> = [];
  private doctorId: string | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get('id');
      if (this.doctorId) this.fetchSlots();
    });
  }

  private fetchSlots() {
    this.http
      .get<
        Array<CalendarSlot>
      >(`http://localhost:3000/appointments?doctorId=${this.doctorId}`)
      .subscribe({
        next: (data) => {
          this.slots = data.map(
            (it) =>
              ({
                startTime: new Date(it.startTime),
                endTime: new Date(it.endTime),
                isBooked: it.isBooked,
              }) as CalendarSlot,
          );
        },
        error: (error) => {
          console.error('Error fetching slots: ', error);
        },
      });
  }

  public openDialog(slot: CalendarSlot) {
    this.dialog
      .open(BookingDialogComponent, {
        width: '250px',
        data: {
          title: slot.isBooked ? 'Cancel Booking' : 'Confirm Booking',
          message: `Time: ${slot.startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })} - ${slot.endTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}`,
        },
        enterAnimationDuration: '200ms',
        exitAnimationDuration: '200ms',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result == 'success') {
          if (slot.isBooked) {
            this.http
              .delete(`http://localhost:3000/appointments`, {
                body: {
                  doctorId: this.doctorId,
                  startTime: slot.startTime,
                },
              })
              .subscribe({
                next: () => {
                  slot.isBooked = false;
                },
                error: (error) => {
                  console.error('Error fetching slots: ', error);
                },
              });
          } else {
            this.http
              .post(`http://localhost:3000/appointments`, {
                doctorId: this.doctorId,
                startTime: slot.startTime,
              })
              .subscribe({
                next: () => {
                  slot.isBooked = true;
                },
                error: (error) => {
                  console.error('Error fetching slots: ', error);
                },
              });
          }
        }
      });
  }
}
