import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideOptimus } from '@openng/optimus-ui/config';
import { MawridPreset } from '@app/theme/mawrid-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(),
    provideOptimus({
      theme: {
        preset: MawridPreset,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
  ],
};
