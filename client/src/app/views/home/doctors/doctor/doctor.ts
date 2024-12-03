import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Doctor } from '../../../../types/doctor';

@Component({
  selector: 'doctor',
  templateUrl: './doctor.html',
  styleUrl: './doctor.css',
  imports: [MatCardModule, MatButtonModule, MatIcon],
})
export class DoctorComponent {
  @Input() doctor!: Doctor;

  constructor(private router: Router) {}

  public book() {
    this.router.navigateByUrl(`/book/${this.doctor.doctorId}`);
  }
}
