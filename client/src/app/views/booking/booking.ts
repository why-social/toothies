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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Booking {
  readonly dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  slots: Array<Slot> = [];
  doctorId: string | null = null;

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.doctorId = params.get("id");
      if (this.doctorId) this.fetchSlots();
    });
  }

  private fetchSlots() {
    this.http
      .get<Array<Slot>>("http://localhost:3000/appointments/")
      .subscribe({
        next: (data) => {
          this.slots = data;
        },
        error: (error) => {
          console.error("Error fetching slots: ", error);
        },
      });
  }

  public openDialog(slot: Slot) {
    this.dialog.open(Dialog, {
      width: "250px",
      enterAnimationDuration: "200ms",
      exitAnimationDuration: "200ms",
    });
  }
}
