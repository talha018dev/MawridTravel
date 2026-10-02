import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './logo.html',
})
export class Logo {}
