import { Component, inject } from '@angular/core';
import { ClinicComponent } from './clinic/clinic';
import { MatPaginator } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { Clinic, PopulatedClinic } from '../../../types/clinic';

@Component({
  selector: 'clinics',
  templateUrl: './clinics.html',
  styleUrl: './clinics.css',
  imports: [ClinicComponent, MatPaginator],
})
export class Clinics {
  private http = inject(HttpClient);

  clinics: Array<Clinic> | null = [
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

  constructor() {
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
  }
}
