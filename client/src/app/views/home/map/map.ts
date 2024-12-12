import {
  Component,
  Input,
  inject,
  AfterViewInit,
  OnChanges,
  ViewChild,
  ElementRef,
  SimpleChanges,
} from '@angular/core';
import { Clinic } from '../../../components/clinic/clinic.interface';
import { LeafletUtil } from '../../../types/leaflet.interface';
import { LeafletMarkerClusterModule } from '@bluehalo/ngx-leaflet-markercluster';
import { PopUpService } from '../../../components/map/popup/map.popup.service';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'clinic-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
  imports: [LeafletMarkerClusterModule],
})
export class ClinicMap implements AfterViewInit, OnChanges {
  private popupService = inject(PopUpService);

  private markerClusterGroup!: Leaflet.MarkerClusterGroup;
  @ViewChild('map') private mapElement!: ElementRef;
  @Input() public clinics: Array<Clinic> | null | undefined;
  private markers: Map<string, Leaflet.Marker>;
  private map!: Leaflet.Map;

  constructor() {
    this.markers = new Map();
  }

  ngAfterViewInit(): void {
    const center: Leaflet.LatLngExpression = [57.7089, 11.9746]; // Gothenburg
    this.map = Leaflet.map(this.mapElement.nativeElement, {
      maxBounds: Leaflet.latLngBounds(
        Leaflet.latLng(center[0] - 0.8, center[1] - 1),
        Leaflet.latLng(center[0] + 1.5, center[1] + 3),
      ),
      center: center,
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clinics']) {
      this.updateMapMarkers();
    }
  }

  private updateMapMarkers(): void {
    if (this.markerClusterGroup && this.clinics) {
      for (let clinic of this.clinics) {
        if (this.markers.has(clinic._id)) {
          continue;
        } else {
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

          this.markers.set(clinic._id, marker);
        }
      }
    }
  }
}
