import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/config';
import { Main } from './app/main/main';

bootstrapApplication(Main, appConfig)
  .catch((err) => console.error(err));
