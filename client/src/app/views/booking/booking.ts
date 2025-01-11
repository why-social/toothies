import { Component, inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { CalendarSlot } from '../../components/calendar/calendar.slots.interface';
import { BookingDialogComponent } from '../../components/booking/dialog/booking.dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { getToken } from '../authentication/guard';
import { Socket } from 'ngx-socket-io';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
@Component({
  templateUrl: './booking.html',
  styleUrl: './booking.css',
  imports: [CalendarComponent, MatIcon, MatProgressBarModule, MatButtonModule],
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private socket = inject(Socket);

  protected slots: Array<CalendarSlot> = [];
  protected doctorName!: string | null | undefined;
  protected clinicName!: string | null | undefined;
  protected subscribed!: boolean | undefined;

  private doctorId: string | null = null;
  private openedDialog: CalendarSlot | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get('id');

      this.fetchData();
    });
  }

  protected fetchData() {
    if (this.doctorId) {
      this.doctorName = undefined;
      this.clinicName = undefined;
      this.subscribed = undefined;

      this.http
        .get<any>(
          `http://localhost:3000/appointments?doctorId=${this.doctorId}`,
          {
            headers: new HttpHeaders().set(
              'Authorization',
              `Bearer ${getToken()}`,
            ),
          },
        )
        .subscribe({
          next: (data) => {
            this.doctorName = data.doctor.name;
            this.clinicName = data.doctor.clinic.name;

            this.slots = data.slots.map((it: CalendarSlot) => ({
              doctorId: data.doctor._id,
              startTime: new Date(it.startTime),
              endTime: new Date(it.endTime),
              bookedBy: it.bookedBy,
            }));
          },
          error: () => {
            this.doctorName = null;
            this.clinicName = null;
          },
        });

      this.http
        .get<any>(
          `http://localhost:3000/subscriptions/doctors/${this.doctorId}`,
          {
            headers: new HttpHeaders().set(
              'Authorization',
              `Bearer ${getToken()}`,
            ),
          },
        )
        .subscribe({
          next: (data) => {
            if (data) {
              this.subscribed = data.subscribed;
            }
          },
        });

      this.socket.disconnect(); // remove prior connection
      this.socket.on(this.doctorId, (msg: any) => {
        const update = JSON.parse(msg);

        let slot = this.slots.find(
          (el) => el.startTime.toISOString() == update.startTime,
        );

        if (slot) {
          slot.bookedBy = update.bookedBy;

          if (this.openedDialog == slot) {
            this.dialog.closeAll();

            this.snackBar.open(
              'Unfortunately, this slot has been booked by someone else!',
              'Dismiss',
            );
          }
        }
      });
    }
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
          title: slot.bookedBy ? 'Cancel Booking' : 'Confirm Booking',
          message: `Clinic: ${this.clinicName}\nDoctor: ${this.doctorName}\nTime: ${timeString}`,
        },
        enterAnimationDuration: '200ms',
        exitAnimationDuration: '200ms',
      })
      .afterClosed()
      .subscribe((result) => {
        this.openedDialog = null;

        if (result == 'success' && getToken()) {
          if (slot.bookedBy) {
            if (slot.bookedBy == getToken(true).userId) {
              this.http
                .delete(`http://localhost:3000/appointments`, {
                  headers: new HttpHeaders().set(
                    'Authorization',
                    `Bearer ${getToken()}`,
                  ),
                  body: {
                    doctorId: this.doctorId,
                    startTime: slot.startTime,
                  },
                })
                .subscribe({
                  next: () => {
                    slot.bookedBy = null;
                  },
                });
            }
          } else {
            this.http
              .post(
                `http://localhost:3000/appointments`,
                {
                  doctorId: this.doctorId,
                  startTime: slot.startTime,
                },
                {
                  headers: new HttpHeaders().set(
                    'Authorization',
                    `Bearer ${getToken()}`,
                  ),
                },
              )
              .subscribe({
                next: () => {
                  slot.bookedBy = getToken(true).userId;
                },
              });
          }
        }
      });
  }

  protected subscribe() {
    this.http
      .post<any>(
        `http://localhost:3000/subscriptions/doctors/${this.doctorId}`,
        null,
        {
          headers: new HttpHeaders().set(
            'Authorization',
            `Bearer ${getToken()}`,
          ),
        },
      )
      .subscribe({
        next: () => {
          this.subscribed = true;
        },
      });
  }

  protected unsubscribe() {
    this.http
      .delete<any>(
        `http://localhost:3000/subscriptions/doctors/${this.doctorId}`,
        {
          headers: new HttpHeaders().set(
            'Authorization',
            `Bearer ${getToken()}`,
          ),
        },
      )
      .subscribe({
        next: () => {
          this.subscribed = false;
        }
      });
  }
}
