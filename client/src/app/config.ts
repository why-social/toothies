import {
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./routes";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

import { provideHttpClient } from "@angular/common/http";

import { SocketIoModule, SocketIoConfig } from "ngx-socket-io";

const socketConfig: SocketIoConfig = {
  url: "ws://localhost:3000",
  options: {},
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(),
    importProvidersFrom(SocketIoModule.forRoot(socketConfig)),
  ],
};
