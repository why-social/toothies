import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ValidatorFn,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { hashSync } from 'bcrypt-ts';

@Component({
  templateUrl: './register.html',
  styleUrl: './register.css',
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
export class Register {
  private formBuilder = inject(FormBuilder);

  protected http = inject(HttpClient);
  protected router = inject(Router);
  protected passwordsMatch!: boolean;
  protected registering: boolean;

  constructor() {
    this.registering = false;
  }

  personnummer = this.formBuilder.group({
    personnummer: [
      '',
      Validators.pattern(/^(?:19|20)?(\d{2})(\d{2})(\d{2})-?(\d{4})$/),
    ],
  });
  name = this.formBuilder.group({
    name: ['', Validators.pattern(/^[A-Za-zÀ-ÿ]+([ '-][A-Za-zÀ-ÿ]+)+$/)],
  });
  password = this.formBuilder.group({
    password: [
      '',
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!$%^&*()_+={}\[\]:;"'<>,.?/\\|`~\-]{8,}$/,
      ),
    ],
    confirm: [
      '',
      (): ValidationErrors | null => {
        this.invalidatePassword();

        return this.passwordsMatch ? null : { arePasswordsTheSame: false };
      },
    ],
  });
  mail = this.formBuilder.group({
    mail: [
      '',
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ],
  });

  invalidatePassword(): void {
    if (
      this.password &&
      this.password.controls &&
      this.password.controls['password'].value ==
        this.password.controls['confirm'].value
    ) {
      this.passwordsMatch = true;
    } else {
      this.passwordsMatch = false;
    }
  }

  submit() {
    if (
      this.personnummer.valid &&
      this.name.valid &&
      this.mail.valid &&
      this.password.valid &&
      this.password?.controls['password']?.value
    ) {
      this.registering = true;

      this.http
        .post(
          `http://${import.meta.env['NG_APP_API_GATEWAY_ADDRESS'] || 'localhost:3000'}/auth/register`,
          {
            personnummer: this.personnummer.value.personnummer,
            name: this.name.value.name,
            email: this.mail.value.mail,
            passwordHash: hashSync(this.password.controls['password'].value),
          },
        )
        .subscribe({
          next: (res: any) => {
            if (res?.token) {
              localStorage.setItem('token', res.token);

              this.router.navigateByUrl('');
            }

            this.registering = false;
          },
          error: () => {
            this.registering = false;
          },
        });
    }
  }
}
