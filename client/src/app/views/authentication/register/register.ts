import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';

@Component({
  templateUrl: './register.html',
  styleUrl: './register.css',
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class Register {
  private formBuilder = inject(FormBuilder);
  protected passwordsMatch!: boolean;

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
    confirm: ['', this.arePasswordsTheSame()],
  });
  mail = this.formBuilder.group({
    mail: [
      '',
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
    ],
  });

  arePasswordsTheSame(): ValidatorFn {
    return (): ValidationErrors | null => {
      this.invalidatePassword();

      return this.passwordsMatch ? null : { arePasswordsTheSame: false };
    };
  }

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
      this.password.valid
    ) {
      // register user
    }
  }
}
