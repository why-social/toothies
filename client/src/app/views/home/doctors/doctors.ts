import { Component } from '@angular/core';
import { DoctorComponent } from './doctor/doctor';
import { MatPaginator } from '@angular/material/paginator';
import { PopulatedDoctor } from '../../../types/doctor';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent, MatPaginator],
})
export class Doctors {
  doctors: Array<PopulatedDoctor> = [
    {
      name: 'John Smith',
      doctorId: '1',
      clinic: {
        name: 'The Clinic',
        location: {
          latitude: 40,
          longitude: 41,
          postCode: 425567,
          city: 'Gothenburg',
          address: 'Plejadgatan 22',
        },
        doctors: ['1', '2'],
      },
      type: 'Orthodont',
    },
    {
      name: 'John Doe',
      doctorId: '2',
      clinic: {
        name: 'The Clinic',
        location: {
          latitude: 40,
          longitude: 41,
          postCode: 425567,
          city: 'Gothenburg',
          address: 'Plejadgatan 22',
        },
        doctors: ['1', '2'],
      },
      type: 'Orthodont',
    },
    {
      name: 'Joe Mama',
      doctorId: '3',
      clinic: {
        name: 'The Second Clinic',
        location: {
          latitude: 42,
          longitude: 43,
          postCode: 42567,
          city: 'Gothenburg',
          address: 'Plejadgatan 24',
        },
        doctors: ['3'],
      },
      type: 'Orthodont',
    },
  ];
}
