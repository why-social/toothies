import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Clinic } from '../../../components/clinic/clinic.interface';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpHeaders } from '@angular/common/http';
import { getToken } from '../../authentication/guard';
import { FormBuilder } from '@angular/forms';
import { EventEmitter } from '@angular/core';
import { Input, Output } from '@angular/core';
import { Doctor } from '../../../components/doctor/doctor.interface';

@Component({
  selector: 'admin-doctors',
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
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
export class AdminDoctors implements OnInit {
  @Output() reloadEvent = new EventEmitter();
  @Input() clinics: Array<Clinic> | null | undefined;
  @Input() doctors: Array<Doctor> | null | undefined;

  private http = inject(HttpClient);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  protected doctorsControl = new FormControl('');
  protected insertionForm = this.formBuilder.group({
    name: ['', Validators.required],
    type: '',
    clinic: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-fA-F0-9]{24}$/),
        (control: AbstractControl): ValidationErrors | null => {
          const value = control.value;

          if (!value) {
            return null;
          }

          return this.clinics?.filter((clinic) => {
            clinic._id == value;
          }).length == 1
            ? { isValidClinic: true }
            : null;
        },
      ],
    ],
    password: [
      '',
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/,
      ),
    ],
    mail: [
      '',
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ],
  });

  protected filteredClinics!: Observable<Clinic[] | null>;
  protected filteredDoctors!: Observable<Doctor[] | null>;

  ngOnInit(): void {
    this.filteredDoctors = this.doctorsControl.valueChanges.pipe(
      startWith(''),
      map((value) => this.filter(this.doctors, value || '')),
    );

    this.filteredClinics = this.insertionForm.valueChanges.pipe(
      startWith(''),
      map((value) =>
        this.filter(
          this.clinics,
          (
            value as Partial<{
              name: string | null;
              type: string | null;
              clinic: string | null;
            }>
          ).clinic || '',
        ),
      ),
    );
  }

  private filter<G extends Clinic | Doctor>(
    list: G[] | null | undefined,
    value: string,
  ): G[] | null {
    if (list) {
      return list
        .filter((item) => {
          return (
            item._id.startsWith(value) ||
            item.name.toLowerCase().includes(value.toLowerCase())
          );
        })
        .slice(0, 5);
    }

    return null;
  }

  protected deleteDoctor(identifier: string) {
    if (!identifier) {
      return;
    }

    /*this.http
      .delete<Array<any>>(`http://localhost:3000/doctors/${identifier}`, {
        headers: new HttpHeaders().set('Authorization', `Bearer ${getToken()}`),
      })
      .subscribe({
        next: (res: any) => {
          if (res?.deletedCount > 0) {
            this.doctors = this.doctors?.filter(
              (clinic) => clinic._id != identifier,
            );

            this.snackBar.open('Doctor successfully removed.', 'Dismiss');
          } else {
            this.snackBar.open(
              'No doctor with the provided identifier was found.',
              'Dismiss',
            );
          }
        },
        error: () => {
          this.snackBar.open(
            'There was an error deleting the doctor.',
            'Dismiss',
          );
        },
      });*/
  }

  protected insertDoctor() {}
}
