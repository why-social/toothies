import { Component } from '@angular/core';
import { DoctorComponent, Doctor } from './doctor/doctor';
import { Router } from '@angular/router';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent],
})
export class Doctors {
  doctors: Array<Doctor> = [
    {
      name: 'John Smith',
      doctorId: '1',
      location: 'Plejadgatan 22',
      type: 'Orthodont',
    },
    {
      name: 'John Doe',
      doctorId: '2',
      location: 'Plejadgatan 24',
      type: 'Orthodont',
    },
    {
      name: 'Joe Mama',
      doctorId: '3',
      location: 'Plejadgatan 20',
      type: 'Orthodont',
    },
  ];

  constructor(private router: Router) {}

  public book(doctorId: string) {
    this.router.navigateByUrl(`/book/${doctorId}`);
  }
}
