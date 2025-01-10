import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  templateUrl: './not.found.html',
  styleUrl: './not.found.css',
  imports: [MatButtonModule],
})
export class NotFound {
  protected router = inject(Router);
}
