import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ClinicComponent } from '../../../components/clinic/clinic.component';
import { Clinic } from '../../../components/clinic/clinic.interface';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'clinics',
  templateUrl: './clinics.html',
  styleUrl: './clinics.css',
  imports: [ClinicComponent, MatProgressBarModule, MatButtonModule],
})
export class Clinics {
  @Output() reloadEvent = new EventEmitter();
  @Input() clinics: Array<Clinic> | null | undefined;
}
