import { Router } from "@angular/router";

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injectable,
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Calendar } from "../../components/calendar/calendar";
import { Slot } from "../../types/slots";
import { Dialog } from "./dialog/dialog";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";

@Injectable({ providedIn: "root" })
@Component({
  templateUrl: "./booking.html",
  styleUrl: "./booking.css",
  imports: [Calendar],
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  slots: Array<Slot> = [];
  private doctorId: string | null = null;
  private pendingSlot: Slot | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get("id");
      if (this.doctorId) this.fetchSlots();
    });
  }

  private fetchSlots() {
    this.http
      .get<
        Array<Slot>
      >(`http://localhost:3000/appointments?doctorId=${this.doctorId}`)
      .subscribe({
        next: (data) => {
          this.slots = data.map(
            (it) =>
              ({
                startTime: new Date(it.startTime),
                endTime: new Date(it.endTime),
                isBooked: it.isBooked,
              }) as Slot,
          );
        },
        error: (error) => {
          console.error("Error fetching slots: ", error);
        },
      });
  }

  public openBookingDialog(slot: Slot) {
    this.pendingSlot = slot;

    this.dialog
      .open(Dialog, {
        width: "250px",
        data: {
          title: "Confirm Booking",
          message: `Time: ${slot.startTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })} - ${slot.endTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}`,
        },
        enterAnimationDuration: "200ms",
        exitAnimationDuration: "200ms",
      })
      .afterClosed()
      .subscribe((result) => {
        if (result == "success") {
          console.log("posting");
          this.http
            .post(`http://localhost:3000/appointments`, {
              doctorId: this.doctorId,
              startTime: slot.startTime,
            })
            .subscribe({
              next: () => {
                this.router.navigate(["/"]);
                // this.fetchSlots();
              },
              error: (error) => {
                console.error("Error fetching slots: ", error);
              },
            });
        }

        this.pendingSlot = null;
      });
  }
}
