import { Routes } from '@angular/router';
import { Booking } from './views/booking/booking';
import { Home } from './views/home/home';

export const routes: Routes = [
  { path: 'book/:id', component: Booking },
  { path: 'book', redirectTo: '' },
  { path: '', component: Home },
];
