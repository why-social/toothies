import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  templateUrl: './main.html',
  styleUrl: './main.css',
  imports: [RouterOutlet, MatToolbar],
})
export class Main {}
