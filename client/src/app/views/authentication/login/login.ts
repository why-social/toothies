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
      Validators.pattern(/^(?:19|20)?(\d{2})(\d{2})(\d{2})-?(\d{4})$/),
    ],
    password: [
      '',
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/,
      ),
    ],
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
            if (res?.data?.token) {
              localStorage.setItem('token', res.data.token);

              this.router.navigateByUrl('');
            }

            this.logging = false;
          },
          error: (error) => {
            console.error('Error registering user: ', error);

            this.logging = false;
          },
        });
    }
  }
}
