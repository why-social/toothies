import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'doctor',
  templateUrl: './doctor.html',
  styleUrl: './doctor.css',
  imports: [MatCardModule, MatButtonModule, MatIcon],
})
export class DoctorComponent {
  @Input() doctor!: Doctor;
}

export interface Doctor {
  name: string;
  doctorId: string;
  location: string;
  type: string;
}
