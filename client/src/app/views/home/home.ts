import { Component, inject } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Doctors } from './doctors/doctors';
import { Clinics } from './clinics/clinics';
import { ClinicMap } from './map/map';
import { getToken } from '../authentication/guard';
import { Clinic } from '../../components/clinic/clinic.interface';
import { Doctor } from '../../components/doctor/doctor.interface';
import { Booking } from '../../components/booking/booking.interface';
import { BookingComponent } from '../../components/booking/booking.component';

@Component({
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Clinics, Doctors, MatTabGroup, MatTab, ClinicMap, BookingComponent],
})
export class Home {
  private http = inject(HttpClient);

  clinics: Array<Clinic> | null | undefined;
  doctors: Array<Doctor> | null | undefined;
  bookings: Array<Booking> | null | undefined;

  constructor() {
    this.fetchDoctors();
    this.fetchClinics();
    this.fetchBookings();
  }

  protected fetchDoctors(): void {
    this.doctors = undefined;

    this.http.get<Array<any>>(`http://localhost:3000/doctors`).subscribe({
      next: (data) => {
        this.doctors = data
          .filter((el) => el.name && el._id && el.type)
          .map(
            (it) =>
              ({
                name: it.name,
                _id: it._id,
                type: it.type,
                clinic: it.clinic,
              }) as Doctor,
          );
      },
      error: () => {
        this.doctors = null;
      },
    });
  }

  protected fetchClinics(): void {
    this.clinics = undefined;

    this.http.get<Array<any>>(`http://localhost:3000/clinics`).subscribe({
      next: (data) => {
        this.clinics = data
          .filter(
            (el) =>
              el.name &&
              el._id &&
              el.location &&
              el.location.latitude &&
              el.location.longitude &&
              el.location.city &&
              el.location.address,
          )
          .map(
            (it) =>
              ({
                name: it.name,
                _id: it._id,
                location: it.location,
              }) as Clinic,
          );
      },
      error: () => {
        this.clinics = null;
      },
    });
  }

  protected fetchBookings(): void {
    this.bookings = undefined;

    const userID = getToken(true).userId;

    if (userID) {
      this.http
        .get<Array<any>>(`http://localhost:3000/appointments/user`, {
          headers: new HttpHeaders().set(
            'Authorization',
            `Bearer ${getToken()}`,
          ),
        })
        .subscribe({
          next: (data) => {
            this.bookings = data
              .filter(
                (el) =>
                  el.startTime && el.endTime && el.doctor && el.doctor.name,
              )
              .map(
                (it) =>
                  ({
                    start: new Date(it.startTime),
                    end: new Date(it.endTime),
                    doctor: {
                      _id: it.doctor._id,
                      name: it.doctor.name,
                    },
                  }) as Booking,
              );
          },
          error: () => {
            this.bookings = null;
          },
        });
    }
  }

  protected removeBooking(booking: Booking) {
    this.bookings = this.bookings?.filter(function (item) {
      return item !== booking;
    });
  }
}
