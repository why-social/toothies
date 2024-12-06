import { Component, Input } from '@angular/core';
import { ClinicComponent } from './clinic/clinic';
import { MatPaginator } from '@angular/material/paginator';
import { Clinic } from '../../../types/clinic';

@Component({
  selector: 'clinics',
  templateUrl: './clinics.html',
  styleUrl: './clinics.css',
  imports: [ClinicComponent, MatPaginator],
})
export class Clinics {
  @Input() clinics!: Array<Clinic>;
}
