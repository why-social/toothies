import { Component } from '@angular/core';
import { Doctors } from '../../components/doctors/doctors';
import { MatTabGroup, MatTab } from '@angular/material/tabs';

@Component({
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Doctors, MatTabGroup, MatTab],
})
export class Home {}
