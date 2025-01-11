import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AdminGuard, AuthGuard } from '../views/authentication/guard';
import { MatButtonModule } from '@angular/material/button';
import { HttpResponseInterceptor } from '../interceptors/HttpResponseInterceptor';

@Component({
  selector: 'app-root',
  templateUrl: './main.html',
  styleUrl: './main.css',
  imports: [RouterOutlet, MatIcon, MatButtonModule],
})
export class Main implements OnInit {
  private static readonly LOCAL_STORAGE_WRITE_KEY =
    'writeModeNotificationTimeout';

  protected router = inject(Router);

  protected inWriteOnlyMode: boolean;

  constructor() {
    this.inWriteOnlyMode =
      Number(localStorage.getItem(Main.LOCAL_STORAGE_WRITE_KEY)) - Date.now() >
      0;
  }

  ngOnInit(): void {
    HttpResponseInterceptor.addResponseListener((request, response) => {
      if (response?.body?.type == 'WriteNotAllowed') {
        this.inWriteOnlyMode = true;

        localStorage.setItem(
          Main.LOCAL_STORAGE_WRITE_KEY,
          String(Date.now() + 10 * 60 * 1000), // 10 minutes
        );
      } else if (
        request.method != 'GET' &&
        !response?.body?.type &&
        response?.body?.status != 500 &&
        response.status >= 200 &&
        response.status < 400
      ) {
        this.inWriteOnlyMode = false;

        localStorage.removeItem(Main.LOCAL_STORAGE_WRITE_KEY);
      }
    });
  }

  logOut() {
    localStorage.removeItem('token');

    this.router.navigateByUrl('login');
  }

  isGuardProtected(): boolean {
    let currentRoute = this.router.routerState.root;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const currentRouteConfig = currentRoute?.routeConfig;

    if (currentRouteConfig?.canMatch) {
      for (const guard of currentRouteConfig.canMatch) {
        if (guard.name == AuthGuard.name || guard.name == AdminGuard.name) {
          return true;
        }
      }
    }

    return false;
  }
}
