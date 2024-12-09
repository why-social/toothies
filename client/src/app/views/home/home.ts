import { Component, inject } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { Doctors } from './doctors/doctors';
import { Clinics } from './clinics/clinics';
import { ClinicMap } from './map/map';
import { Clinic } from '../../components/clinic/clinic.interface';
import { Doctor } from '../../components/doctor/doctor.interface';

@Component({
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Clinics, Doctors, MatTabGroup, MatTab, ClinicMap],
})
export class Home {
  private http = inject(HttpClient);

  clinics: Array<Clinic> = [
    {
      _id: '1',
      name: 'The clinic',
      location: {
        latitude: 57.7089,
        longitude: 11.9746,
        city: 'Gothenburg',
        address: 'Plejadgatan 22',
      }
    },
    {
      _id: '2',
      name: 'The clinic',
      location: {
        latitude: 57.6089,
        longitude: 11.846,
        city: 'Gothenburg',
        address: 'Plejadgatan 20',
      }
    },
    {
      _id: '3',
      name: 'The clinic',
      location: {
        latitude: 57.7189,
        longitude: 12,
        city: 'Gothenburg',
        address: 'Plejadgatan 24',
      }
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
