import {
  Component,
  Input,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Clinic } from '../../../components/clinic/clinic.interface';
import { LeafletUtil } from '../../../types/leaflet.interface';
import { Router } from '@angular/router';
import { LeafletMarkerClusterModule } from '@bluehalo/ngx-leaflet-markercluster';
import { PopUpService } from '../../../components/map/popup/map.popup.service';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'clinic-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
  imports: [LeafletMarkerClusterModule],
})
export class ClinicMap implements AfterViewInit {
  private map!: Leaflet.Map;
  private markerClusterGroup!: Leaflet.MarkerClusterGroup;

  @ViewChild('map') mapElement!: ElementRef;

  @Input() clinics!: Array<Clinic>;

  constructor(
    private router: Router,
    private popupService: PopUpService,
  ) {}

  ngAfterViewInit(): void {
    this.map = Leaflet.map(this.mapElement.nativeElement, {
      center: [57.7089, 11.9746], // Gothenburg
      zoom: 9,
    });

    Leaflet.tileLayer(
      'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        minZoom: 9,
      },
    ).addTo(this.map);

    this.markerClusterGroup = Leaflet.markerClusterGroup({
      removeOutsideVisibleBounds: true,
    });
    this.markerClusterGroup.addTo(this.map);

    this.updateMapMarkers();

    let currentRect!: DOMRectReadOnly;
    new ResizeObserver((observerEntry: Array<ResizeObserverEntry>) => {
      const rect = observerEntry[0].contentRect;

      if (rect != currentRect) {
        this.map.invalidateSize();
      }
    }).observe(this.mapElement.nativeElement);
  }

  private updateMapMarkers(): void {
    if (this.markerClusterGroup) {
      for (let clinic of this.clinics) {
        const marker = Leaflet.marker(
          [clinic.location.latitude, clinic.location.longitude],
          {
            icon: LeafletUtil.marker,
          },
        );

        marker.bindPopup(
          this.popupService.returnPopUpHTML({
            title: clinic.name,
            message: clinic.location.address,
            label: 'More info',
            route: `clinic/${clinic._id}`,
          }),
        );
        marker.addTo(this.markerClusterGroup);
      }
    }
  }
}
