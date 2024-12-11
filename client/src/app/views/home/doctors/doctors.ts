import { Component, Input } from '@angular/core';
import { DoctorComponent } from '../../../components/doctor/doctor.component';
import { Doctor } from '../../../components/doctor/doctor.interface';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent, MatProgressBarModule],
})
export class Doctors {
  @Input() doctors!: Array<Doctor>;
}
