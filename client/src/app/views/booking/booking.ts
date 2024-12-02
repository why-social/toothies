import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Calendar } from '../../components/calendar/calendar';
import { Slot } from '../../types/slots';
import { Dialog } from './dialog/dialog';

@Component({
  templateUrl: './booking.html',
  styleUrl: './booking.css',
  imports: [Calendar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Booking {
  readonly dialog = inject(MatDialog);

  slots: Array<Slot> = [
    {
      startTime: new Date('2024-12-02T09:00:00.000+00:00'),
      endTime: new Date('2024-12-02T10:00:00.000+00:00'),
      isBooked: true,
    },
    {
      startTime: new Date('2024-12-02T13:00:00.000+01:00'),
      endTime: new Date('2024-12-02T14:00:00.000+01:00'),
      isBooked: false,
    },
    {
      startTime: new Date('2024-12-04T12:20:00.000+01:00'),
      endTime: new Date('2024-12-04T15:15:00.000+01:00'),
      isBooked: true,
    },
  ];

  public openDialog(slot: Slot) {
    this.dialog.open(Dialog, {
      width: '250px',
      enterAnimationDuration: '200ms',
      exitAnimationDuration: '200ms',
    });
  }
}
