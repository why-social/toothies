import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { Doctor } from '../../components/doctor/doctor.interface';
import { Clinic } from '../../components/clinic/clinic.interface';
import { HttpClient } from '@angular/common/http';
import { DoctorComponent } from '../../components/doctor/doctor.component';
import { LeafletUtil } from '../../types/leaflet.interface';
import { MatIcon } from '@angular/material/icon';
import * as Leaflet from 'leaflet';

@Component({
  templateUrl: './clinic.html',
  styleUrl: './clinic.css',
  imports: [DoctorComponent, MatIcon],
})
export class ClinicView implements AfterViewInit {
  private http = inject(HttpClient);
  private map!: Leaflet.Map;

  @ViewChild('map') mapElement!: ElementRef;

  @Input() clinic: Clinic = {
    _id: '1',
    name: 'The clinic',
    location: {
      latitude: 57.7089,
      longitude: 11.9746,
      city: 'Gothenburg',
      address: 'Plejadgatan 22',
    },
  };

  doctors!: Array<Doctor>;

  constructor() {
    //TODO: get clinic

    // get doctors in clinic
    this.http.get<Array<any>>(`http://localhost:3000/doctors`).subscribe({
      next: (data) => {
        this.doctors = data.map(
          (it: Doctor) =>
            ({
              name: it.name,
              _id: it._id,
              type: it.type,
            }) as Doctor,
        );
      },
      error: (error) => {
        console.error('Error fetching doctors: ', error);
      },
    });
  }

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

    Leaflet.marker(
      [this.clinic.location.latitude, this.clinic.location.longitude],
      { icon: LeafletUtil.marker },
    ).addTo(this.map);

    let currentRect!: DOMRectReadOnly;

    new ResizeObserver((observerEntry: Array<ResizeObserverEntry>) => {
      const rect = observerEntry[0].contentRect;

      if (rect != currentRect) {
        this.map.invalidateSize();
      }
    }).observe(this.mapElement.nativeElement);
  }
}
