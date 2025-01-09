import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Clinic } from '../../components/clinic/clinic.interface';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpHeaders } from '@angular/common/http';
import { getToken } from '../authentication/guard';
import { FormBuilder } from '@angular/forms';

@Component({
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatProgressSpinner,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    AsyncPipe,
  ],
})
export class Admin implements OnInit {
  private http = inject(HttpClient);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  protected control = new FormControl('');
  protected clinics: Array<Clinic> | null | undefined;
  protected filteredClinics!: Observable<Clinic[] | null>;

  protected insertionForm = this.formBuilder.group({
    name: ['', Validators.required],
    latitude: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[-+]?([1-8]?\d(\.\d{1,6})?|90(\.0{1,6})?)$/),
      ],
    ],
    longitude: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[-+]?((1[0-7]\d(\.\d+)?)|(\d{1,2}(\.\d+)?))$/),
      ],
    ],
    city: ['', Validators.required],
    address: ['', Validators.required],
  });

  ngOnInit(): void {
    this.filteredClinics = this.control.valueChanges.pipe(
      startWith(''),
      map((value) => this.filter(value || '')),
    );

    this.fetchClinics();
  }

  private filter(value: string): Clinic[] | null {
    if (this.clinics) {
      return this.clinics
        .filter(
          (clinic) =>
            clinic._id.startsWith(value) ||
            clinic.name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 5);
    }

    return null;
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

  protected deleteClinic(identifier: string) {
    if (!identifier || identifier.length != 24) {
      return;
    }

    this.http
      .delete<Array<any>>(`http://localhost:3000/clinics/${identifier}`, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${getToken()}`),
      })
      .subscribe({
        next: (res: any) => {
          if (res?.deletedCount > 0) {
            this.clinics = this.clinics?.filter(
              (clinic) => clinic._id != identifier,
            );

            this.snackBar.open('Clinic successfully removed.', 'Dismiss');
          } else {
            this.snackBar.open(
              'No clinic with the provided identifier was found.',
              'Dismiss',
            );
          }
        },
        error: () => {
          this.snackBar.open(
            'There was an error deleting the clinic.',
            'Dismiss',
          );
        },
      });
  }

  protected insertClinic() {
    if (!this.insertionForm.valid) {
      this.snackBar.open('The provided data is not valid.', 'Dismiss');

      return;
    }

    const clinicData = this.insertionForm.value;

    this.http
      .post<Array<any>>(
        `http://localhost:3000/clinics/`,
        {
          name: clinicData.name,
          location: {
            latitude: clinicData.latitude,
            longitude: clinicData.longitude,
            city: clinicData.city,
            address: clinicData.address,
          },
        },
        {
          headers: new HttpHeaders().set(
            'Authorization',
            `Bearer ${getToken()}`,
          ),
        },
      )
      .subscribe({
        next: (res: any) => {
          if (res.insertedId) {
            const clinic = {
              _id: String(res.insertedId),
              name: clinicData.name,
              location: {
                latitude: Number(clinicData.latitude),
                longitude: Number(clinicData.longitude),
                city: clinicData.city,
                address: clinicData.address,
              },
            } as Clinic | undefined;

            if (clinic) {
              this.clinics?.push(clinic);
              this.snackBar.open(
                'Clinic was successfully inserted.',
                'Dismiss',
              );
            }
          }
        },
        error: (err) => {
          if (err?.status == 400) {
            this.snackBar.open('The provided data is not valid.', 'Dismiss');
          } else {
            this.snackBar.open(
              'There was an error creating the clinic.',
              'Dismiss',
            );
          }
        },
      });
  }
}
