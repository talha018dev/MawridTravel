import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideOptimus } from '@openng/optimus-ui/config';
import { definePreset } from '@openng/optimus-ui-themes';
import Aura from '@openng/optimus-ui-themes/aura';

const MawridPreset = definePreset(Aura, {
  css: `
    button,
    input,
    optgroup,
    select,
    textarea {
      font-family: 'Lato', system-ui, sans-serif;
    }

    .p-button {
      font-family: 'Lato', system-ui, sans-serif !important;
    }
  `,
  semantic: {
    primary: {
      50: '#f6f1f8',
      100: '#e9e4ed',
      200: '#d1c8dc',
      300: '#aa9aba',
      400: '#77658e',
      500: '#20183f',
      600: '#1c1538',
      700: '#181230',
      800: '#140f28',
      900: '#100c20',
      950: '#0b0817',
    },
    colorScheme: {
      light: {
        primary: {
          color: '#20183f',
          contrastColor: '#ffffff',
          hoverColor: '#181230',
          activeColor: '#100c20',
        },
      },
      dark: {
        primary: {
          color: '#20183f',
          contrastColor: '#ffffff',
          hoverColor: '#302653',
          activeColor: 'var(--mawrid-secondary)',
        },
      },
    },
  },
});

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
