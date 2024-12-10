import { Component, inject } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { Doctors } from './doctors/doctors';
import { Clinics } from './clinics/clinics';
import { Clinic } from '../../types/clinic';
import { Doctor } from '../../types/doctor';

@Component({
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Clinics, Doctors, MatTabGroup, MatTab],
})
export class Home {
  private http = inject(HttpClient);

  clinics!: Array<Clinic>;
  doctors!: Array<Doctor>;

  constructor() {
    //get clinics
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
      error: (error) => {
        console.error('Error fetching clinics: ', error);
      },
    });

    // get doctors
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
              }) as Doctor,
          );
      },
      error: (error) => {
        console.error('Error fetching doctors: ', error);
      },
    });
  }
}
