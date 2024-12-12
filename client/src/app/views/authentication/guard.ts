import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

export const AuthGuard: CanActivateFn = (): boolean => {
  if (!isLoggedIn()) {
    inject(Router).navigateByUrl('/login');
    return false;
  }

  return true;
};

function isLoggedIn(): boolean {
  const token = localStorage.getItem('token');

  if (token) {
    try {
      const decoded = jwtDecode(token);

      return !!decoded?.exp && new Date().getTime() / 1000 < decoded.exp;
    } catch (error) {
      return false;
    }
  }

  return false;
}
