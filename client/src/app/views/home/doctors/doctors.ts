import { Component, Input } from '@angular/core';
import { DoctorComponent } from '../../../components/doctor/doctor';
import { Doctor } from '../../../types/doctor';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent],
})
export class Doctors {
  @Input() doctors!: Array<Doctor>;
}
