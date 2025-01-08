import { CanMatchFn } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

export const AdminGuard: CanMatchFn = (): boolean => {
  return isAdmin();
};

export const NegatedAdminGuard: CanMatchFn = (): boolean => {
  return !isAdmin();
};

export const AuthGuard: CanMatchFn = (): boolean => {
  return isLoggedIn();
};

export const NegatedAuthGuard: CanMatchFn = (): boolean => {
  return !isLoggedIn();
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

function isLoggedIn(decodedToken?: any): boolean {
  const exp = (decodedToken ? decodedToken : getToken(true))?.exp;

  return exp && new Date().getTime() / 1000 < exp;
}

function isAdmin(): boolean {
  const decoded = getToken(true);

  return isLoggedIn(decoded) && decoded?.userId == 'admin';
}
