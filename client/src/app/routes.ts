import { Routes } from '@angular/router';
import { Booking } from './views/booking/booking';
import { Home } from './views/home/home';
import { Login } from './views/authentication/login/login';
import { Register } from './views/authentication/register/register';
import {
  AdminGuard,
  AuthGuard,
  NegatedAuthGuard,
  NegatedAdminGuard,
} from './views/authentication/guard';
import { NotFound } from './views/not.found/not.found';
import { ClinicView } from './views/clinic/clinic';
import { Admin } from './views/admin/admin';

export const routes: Routes = [
  {
    path: 'book/:id',
    pathMatch: 'full',
    component: Booking,
    canMatch: [AuthGuard, NegatedAdminGuard],
  },
  {
    path: 'book',
    redirectTo: '404',
    pathMatch: 'full',
  },
  {
    path: 'clinic/:id',
    pathMatch: 'full',
    component: ClinicView,
    canMatch: [AuthGuard, NegatedAdminGuard],
  },
  {
    path: 'clinic',
    redirectTo: '404',
    pathMatch: 'full',
  },
  {
    path: '',
    component: Admin,
    pathMatch: 'full',
    canMatch: [AdminGuard],
  },
  {
    path: '',
    component: Home,
    pathMatch: 'full',
    canMatch: [AuthGuard, NegatedAdminGuard],
  },
  {
    path: 'login',
    pathMatch: 'full',
    component: Login,
    canMatch: [NegatedAuthGuard, NegatedAdminGuard],
  },
  {
    path: 'register',
    pathMatch: 'full',
    component: Register,
    canMatch: [NegatedAuthGuard, NegatedAdminGuard],
  },

  { path: '404', component: NotFound },

  { path: '**', redirectTo: '404' },
];
