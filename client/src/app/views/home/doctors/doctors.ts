import { Component, inject } from '@angular/core';
import { DoctorComponent } from './doctor/doctor';
import { MatPaginator } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { Doctor, PopulatedDoctor } from '../../../types/doctor';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent, MatPaginator],
})
export class Doctors {
  private http = inject(HttpClient);

  doctors: Array<Doctor> | null = null;

  constructor() {
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
