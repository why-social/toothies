import { Component, Input } from '@angular/core';
import { DoctorComponent } from './doctor/doctor';
import { MatPaginator } from '@angular/material/paginator';
import { Doctor } from '../../../types/doctor';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent, MatPaginator],
})
export class Doctors {
  @Input() doctors!: Array<Doctor>;
}
