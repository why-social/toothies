import { Routes } from '@angular/router';
import { Booking } from './views/booking/booking';
import { Home } from './views/home/home';
import { ClinicView } from './views/clinic/clinic';

export const routes: Routes = [
  { path: 'book/:id', component: Booking },
  { path: 'book', redirectTo: '' },
  { path: 'clinic/:id', component: ClinicView },
  { path: 'clinic', redirectTo: '' },
  { path: '', component: Home },
];
