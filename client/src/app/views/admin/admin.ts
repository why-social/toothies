import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  imports: [MatButtonModule, MatInputModule],
})
export class Admin {}
