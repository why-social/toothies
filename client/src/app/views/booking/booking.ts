import { Component, inject, Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Calendar } from "../../components/calendar/calendar";
import { Slot } from "../../types/slots";
import { Dialog } from "./dialog/dialog";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";
import { Socket } from "ngx-socket-io";
import { map } from "rxjs/operators";

@Injectable({ providedIn: "root" })
@Component({
  templateUrl: "./booking.html",
  styleUrl: "./booking.css",
  imports: [Calendar],
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private socket = inject(Socket);

  slots: Array<Slot> = [];
  private doctorId: string | null = null;

  public ngOnInit() {
    console.log("init");
    this.route.paramMap.subscribe((params) => {
      console.log("subscribe");
      this.doctorId = params.get("id");

      if (this.doctorId) {
        this.fetchSlots();
        this.socket.on(this.doctorId, (msg: any) => {
          const update = JSON.parse(msg);
          let slot = this.slots.find(
            (e) => e.startTime.toISOString() == update.startTime,
          );
          if (slot) slot.isBooked = update.isBooked;
        });
      }
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

  public openDialog(slot: Slot) {
    this.dialog
      .open(Dialog, {
        width: "250px",
        data: {
          title: slot.isBooked ? "Cancel Booking" : "Confirm Booking",
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
                  console.error("Error fetching slots: ", error);
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
                  console.error("Error fetching slots: ", error);
                },
              });
          }
        }
      });
  }
}
