import { Component, inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { CalendarSlot } from '../../components/calendar/calendar.slots.interface';
import { BookingDialogComponent } from '../../components/booking/dialog/booking.dialog';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { Socket } from 'ngx-socket-io';

@Injectable({ providedIn: 'root' })
@Component({
  templateUrl: './booking.html',
  styleUrl: './booking.css',
  imports: [CalendarComponent, MatIcon],
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private socket = inject(Socket);

  protected slots: Array<CalendarSlot> = [];
  protected doctorName: string | null = null;
  protected clinicName: string | null = null;

  private doctorId: string | null = null;
  private openedDialog: CalendarSlot | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get('id');

      if (this.doctorId) {
        this.fetchSlots();
        this.socket.on(this.doctorId, (msg: any) => {
          const update = JSON.parse(msg);

          let slot = this.slots.find(
            (el) => el.startTime.toISOString() == update.startTime,
          );

          if (slot) {
            slot.isBooked = update.isBooked;

            if (this.openedDialog == slot) {
              this.dialog.closeAll();

              alert(
                'Unfortunately, this slot has been booked by someone else!',
              );
            }
          }
        });
      }
    });
  }

  private fetchSlots() {
    this.http
      .get<any>(`http://localhost:3000/appointments?doctorId=${this.doctorId}`)
      .subscribe({
        next: (data) => {
          this.doctorName = data.doctor.name;
          this.clinicName = data.doctor.clinic.name;

          this.slots = data.slots.map((it: CalendarSlot) => ({
            startTime: new Date(it.startTime),
            endTime: new Date(it.endTime),
            isBooked: it.isBooked,
          }));
        },
        error: (error) => {
          console.error('Error fetching slots: ', error);
        },
      });
  }

  public openDialog(slot: CalendarSlot) {
    this.openedDialog = slot;

    const timeString = `${slot.startTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} - ${slot.endTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;

    this.dialog
      .open(BookingDialogComponent, {
        width: '250px',
        data: {
          title: slot.isBooked ? 'Cancel Booking' : 'Confirm Booking',
          message: `Clinic: ${this.clinicName}\nDoctor: ${this.doctorName}\nTime: ${timeString}`,
        },
        enterAnimationDuration: '200ms',
        exitAnimationDuration: '200ms',
      })
      .afterClosed()
      .subscribe((result) => {
        this.openedDialog = null;

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
                  // slot.isBooked = false;
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
                  // slot.isBooked = true;
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
