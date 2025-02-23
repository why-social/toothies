import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Clinic } from './clinic.interface';

@Component({
  selector: 'clinic',
  templateUrl: './clinic.component.html',
  styleUrl: './clinic.component.css',
  imports: [MatCardModule, MatButtonModule, MatIcon],
})
export class ClinicComponent {
  @Input() clinic!: Clinic;

  constructor(private router: Router) {}

  public goToClinic() {
    this.router.navigateByUrl(`/clinic/${this.clinic._id}`);
  }
}
