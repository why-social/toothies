import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DoctorComponent } from '../../../components/doctor/doctor.component';
import { Doctor } from '../../../components/doctor/doctor.interface';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
  imports: [DoctorComponent, MatProgressBarModule, MatButtonModule],
})
export class Doctors {
  @Output() reloadEvent = new EventEmitter();
  @Input() doctors: Array<Doctor> | null | undefined;
}
