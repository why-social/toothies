import { Component, Input } from '@angular/core';
import { ClinicComponent } from '../../../components/clinic/clinic.component';
import { Clinic } from '../../../components/clinic/clinic.interface';

@Component({
  selector: 'clinics',
  templateUrl: './clinics.html',
  styleUrl: './clinics.css',
  imports: [ClinicComponent],
})
export class Clinics {
  @Input() clinics!: Array<Clinic>;
}
