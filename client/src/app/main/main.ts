import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthGuard } from '../views/authentication/guard';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  templateUrl: './main.html',
  styleUrl: './main.css',
  imports: [RouterOutlet, MatIcon, MatButtonModule],
})
export class Main {
  protected router = inject(Router);

  logOut() {
    localStorage.removeItem('token');

    this.router.navigateByUrl('login');
  }

  isLoginGuardProtected(): boolean {
    let currentRoute = this.router.routerState.root;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const currentRouteConfig = currentRoute?.routeConfig;

    if (currentRouteConfig?.canActivate) {
      for (const guard of currentRouteConfig.canActivate) {
        if (guard.name == AuthGuard.name) {
          return true;
        }
      }
    }

    return false;
  }
}
