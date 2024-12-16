import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  Injectable,
  Injector,
} from '@angular/core';
import { PopUpData } from './map.popup.interface';
import { PopupComponent } from './map.popup.component';

// https://github.com/bluehalo/ngx-leaflet/issues/178#issuecomment-1532051247
@Injectable({ providedIn: 'root' })
export class PopUpService {
  constructor(
    private injector: Injector,
    private environmentInjector: EnvironmentInjector,
    private applicationRef: ApplicationRef,
  ) {}

  returnPopUpHTML(data: PopUpData): HTMLElement {
    const element = document.createElement('div');
    const component = createComponent(PopupComponent, {
      elementInjector: this.injector,
      environmentInjector: this.environmentInjector,
      hostElement: element,
    });

    this.applicationRef.attachView(component.hostView);
    component.instance.data = data;

    return element;
  }
}
