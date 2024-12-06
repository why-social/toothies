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

  clinics: Array<Clinic> = [
    {
      _id: '1',
      name: 'The clinic',
      location: {
        latitude: 40,
        longitude: 40,
        city: 'Gothenburg',
        address: 'Plejadgatan 22',
        postCode: 41757,
      },
      doctors: ['1', '2'],
    },
  ];

  doctors!: Array<Doctor>;

  constructor() {
    //get clinics
    this.http.get<Array<any>>(`http://localhost:3000/clinics`).subscribe({
      next: (data) => {
        this.clinics = data.map(
          (it: Clinic) =>
            ({
              name: it.name,
              _id: it._id,
              location: it.location,
            }) as Clinic,
        );
      },
      error: (error) => {
        console.error('Error fetching doctors: ', error);
      },
    });

    // get doctors
    this.http.get<Array<any>>(`http://localhost:3000/doctors`).subscribe({
      next: (data) => {
        this.doctors = data.map(
          (it: Doctor) =>
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
