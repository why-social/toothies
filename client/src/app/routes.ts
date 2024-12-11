import { Routes } from '@angular/router';
import { Booking } from './views/booking/booking';
import { Home } from './views/home/home';
import { Login } from './views/authentication/login/login';
import { Register } from './views/authentication/register/register';
import { AuthGuard } from './views/authentication/guard';
import { NotFound } from './views/not.found/not.found';

export const routes: Routes = [
  {
    path: 'book/:id',
    pathMatch: 'full',
    component: Booking,
    canActivate: [AuthGuard],
  },
  {
    path: 'book',
    redirectTo: '404',
    pathMatch: 'full',
  },
  {
    path: '',
    component: Home,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },

  { path: 'login', pathMatch: 'full', component: Login },
  { path: 'register', pathMatch: 'full', component: Register },

  { path: '404', component: NotFound },

  { path: '**', redirectTo: '404' },
];
