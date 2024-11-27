import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Calendar } from '../../components/calendar/calendar';

@Component({
	templateUrl: './booking.html',
	styleUrl: './booking.css',
	imports: [Calendar, MatToolbarModule, MatButtonModule, MatIconModule],
})
export class Booking { };