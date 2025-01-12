import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './routes';
import { provideAnimations } from '@angular/platform-browser/animations';

import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { HttpResponseInterceptor } from './interceptors/HttpResponseInterceptor';

const socketConfig: SocketIoConfig = {
  url: `ws://${import.meta.env['NG_APP_API_GATEWAY_ADDRESS'] || 'localhost:3000'}`,
  options: {},
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpResponseInterceptor,
      multi: true,
    },
    importProvidersFrom(SocketIoModule.forRoot(socketConfig)),
  ],
};
