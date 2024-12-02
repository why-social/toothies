import { Component } from '@angular/core';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { Doctors } from './doctors/doctors';

@Component({
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Doctors, MatTabGroup, MatTab],
})
export class Home {}
