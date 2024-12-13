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

export const NegatedAuthGuard: CanActivateFn = (): boolean => {
  if (isLoggedIn()) {
    inject(Router).navigateByUrl('/');
    return false;
  }

  return true;
};

export function getToken(decode?: boolean): any {
  const token = localStorage.getItem('token');

  if (decode) {
    if (token) {
      try {
        return jwtDecode(token);
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  return token;
}

function isLoggedIn(): boolean {
  const exp = getToken(true)?.exp;

  return exp && new Date().getTime() / 1000 < exp;
}
