import { Component, Input, Inject } from '@angular/core';
import { PopUpData } from './map.popup.interface';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  styleUrl: './map.popup.component.css',
  templateUrl: './map.popup.component.html',
  imports: [MatButtonModule],
})
export class PopupComponent {
  @Input() data!: PopUpData;

  constructor(private router: Router) {}

  public go() {
    this.router.navigateByUrl(this.data.route);
  }
}
