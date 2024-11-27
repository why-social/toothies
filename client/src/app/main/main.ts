import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './main.html',
  styleUrl: './main.css',
  imports: [
    RouterOutlet
  ],
})
export class Main { }
