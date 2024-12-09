import { Component, Input } from '@angular/core';
import { DoctorComponent } from '../../../components/doctor/doctor.component';
import { Doctor } from '../../../components/doctor/doctor.interface';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent],
})
export class Doctors {
  @Input() doctors!: Array<Doctor>;
}
