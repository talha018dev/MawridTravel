import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Button } from '@openng/optimus-ui/button';

type ColorTheme = 'light' | 'dark';

@Component({
  selector: 'app-root',
  imports: [Button, RouterLink, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly theme = signal<ColorTheme>('light');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    const savedTheme = localStorage.getItem('mawrid-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const preferredTheme: ColorTheme = prefersDark ? 'dark' : 'light';
    this.setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : preferredTheme);
  }

  protected toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private setTheme(theme: ColorTheme): void {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    if (isPlatformBrowser(this.platformId)) localStorage.setItem('mawrid-theme', theme);
  }
}
