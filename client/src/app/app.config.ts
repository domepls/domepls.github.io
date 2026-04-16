import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth';
import { refreshTokenInterceptor } from './core/interceptors/refresh-token';
import { apiEnvelopeInterceptor } from './core/interceptors/api-envelope';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(
      withInterceptors([apiEnvelopeInterceptor, refreshTokenInterceptor, authInterceptor]),
    ),
  ],
};
