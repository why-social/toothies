import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class Login {
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  protected http = inject(HttpClient);
  protected router = inject(Router);
  protected passwordsMatch!: boolean;
  protected logging: boolean;

  constructor() {
    this.logging = false;
  }

  form = this.formBuilder.group({
    personnummer: [
      '',
      Validators.pattern(/^(?:19|20)?(\d{2})(\d{2})(\d{2})-?(\d{4})|admin$/),
    ],
    password: [''],
  });

  submit() {
    if (
      this.form.valid &&
      this.form.controls['password']?.value &&
      this.form.controls['personnummer']?.value
    ) {
      this.logging = true;

      this.http
        .post(`http://localhost:3000/auth/login`, {
          personnummer: this.form.controls['personnummer'].value,
          password: this.form.controls['password'].value,
        })
        .subscribe({
          next: (res: any) => {
            if (res?.token) {
              localStorage.setItem('token', res.token);

              this.router.navigateByUrl('');
            }

            this.logging = false;
          },
          error: (err) => {
            if (err.error.message) {
              this.snackBar.open(err.error.message, undefined, {
                duration: 3000,
              });
            } else {
              this.snackBar.open('Something went wrong.', undefined, {
                duration: 3000,
              });
            }

            this.logging = false;
          },
        });
    }
  }
}
