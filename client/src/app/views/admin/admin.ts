import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { AdminClinics } from './clinics/clinics';
import { AdminDoctors } from './doctors/doctors';
import { Clinic } from '../../components/clinic/clinic.interface';
import { Doctor } from '../../components/doctor/doctor.interface';
import { HttpClient } from '@angular/common/http';

@Component({
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  imports: [MatTab, MatTabGroup, AdminClinics, AdminDoctors],
})
export class Admin implements OnInit, AfterViewInit {
  private http = inject(HttpClient);

  @ViewChild('representative', { static: false }) representative!: ElementRef;

  protected clinics: Array<Clinic> | null | undefined;
  protected doctors: Array<Doctor> | null | undefined;

  ngOnInit(): void {
    this.fetchClinics();
    this.fetchDoctors();
  }

  ngAfterViewInit(): void {
    const header = document.getElementsByTagName('header')[0];

    if (header) {
      this.representative.nativeElement.style.paddingTop = `calc(2rem + ${header.clientHeight}px)`;

      header.addEventListener('resize', () => {
        this.representative.nativeElement.style.paddingTop = `calc(2rem + ${header.clientHeight}px)`;
      });
    }
  }

  protected fetchClinics(): void {
    this.clinics = undefined;

    this.http.get<Array<any>>(`http://localhost:3000/clinics`).subscribe({
      next: (data) => {
        this.clinics = data
          .filter(
            (el) =>
              el.name &&
              el._id &&
              el.location &&
              el.location.latitude &&
              el.location.longitude &&
              el.location.city &&
              el.location.address,
          )
          .map(
            (it) =>
              ({
                name: it.name,
                _id: it._id,
                location: it.location,
              }) as Clinic,
          );
      },
      error: (error) => {
        this.clinics = null;

        console.error('Error fetching clinics: ', error);
      },
    });
  }

  protected fetchDoctors(): void {
    this.doctors = undefined;

    this.http.get<Array<any>>(`http://localhost:3000/doctors`).subscribe({
      next: (data) => {
        this.doctors = data
          .filter((el) => el.name && el._id && el.clinic)
          .map(
            (it) =>
              ({
                name: it.name,
                _id: it._id,
                clinic: it.clinic,
              }) as Doctor,
          );
      },
      error: (error) => {
        this.doctors = null;

        console.error('Error fetching doctors: ', error);
      },
    });
  }
}
