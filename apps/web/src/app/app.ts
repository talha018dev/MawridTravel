import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from '@app/layout/footer/footer';
import { Navbar } from '@app/layout/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [Footer, Navbar, RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
