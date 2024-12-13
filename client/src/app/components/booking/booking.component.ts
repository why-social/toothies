import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Booking } from './booking.interface';
import { MatDialog } from '@angular/material/dialog';
import { BookingDialogComponent } from './dialog/booking.dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getToken } from '../../views/authentication/guard';

@Component({
  selector: 'booking',
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css',
  imports: [MatCardModule, MatButtonModule, MatIcon],
})
export class BookingComponent {
  @Output() cancelEvent = new EventEmitter();
  @Input() booking!: Booking;

  readonly dialog = inject(MatDialog);
  readonly http = inject(HttpClient);

  constructor() {}

  public openCancelDialog() {
    const timeString = `${this.booking.start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} - ${this.booking.end.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;

    this.dialog
      .open(BookingDialogComponent, {
        width: '250px',
        data: {
          title: 'Cancel Booking',
          message: `Doctor: ${this.booking.doctor.name}\nTime: ${timeString}`,
        },
        enterAnimationDuration: '200ms',
        exitAnimationDuration: '200ms',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result == 'success' && getToken()) {
          this.http
            .delete(`http://localhost:3000/appointments`, {
              headers: new HttpHeaders().set(
                'Authorization',
                `Bearer ${getToken()}`,
              ),
              body: {
                doctorId: this.booking.doctor._id,
                startTime: this.booking.start,
              },
            })
            .subscribe({
              next: () => {
                this.cancelEvent.emit();
              },
              error: (error) => {
                console.error('Error fetching slots: ', error);
              },
            });
        }
      });
  }
}
