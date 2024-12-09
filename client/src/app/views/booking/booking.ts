import { Component, inject, Injectable } from "@angular/core";
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
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  slots: Array<Slot> = [];
  private doctorId: string | null = null;
  private doctorName: string | null = null;
  private clinicName: string | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get("id");
      if (this.doctorId) this.fetchSlots();
    });
  }

  private fetchSlots() {
    this.http
      .get<any>(`http://localhost:3000/appointments?doctorId=${this.doctorId}`)
      .subscribe({
        next: (data) => {
          this.doctorName = data.doctor.name;
          this.clinicName = data.doctor.clinic.name;

          this.slots = data.slots.map((it: Slot) => ({
            startTime: new Date(it.startTime),
            endTime: new Date(it.endTime),
            isBooked: it.isBooked,
          }));
        },
        error: (error) => {
          console.error("Error fetching slots: ", error);
        },
      });
  }

  public openDialog(slot: Slot) {
    const timeString = `${slot.startTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })} - ${slot.endTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
    this.dialog
      .open(Dialog, {
        width: "250px",
        data: {
          title: slot.isBooked ? "Cancel Booking" : "Confirm Booking",
          message: `Clinic: ${this.clinicName}\nDoctor: ${this.doctorName}\nTime: ${timeString}`,
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
                  slot.isBooked = false;
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
                  slot.isBooked = true;
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
