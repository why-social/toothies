import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { Doctor } from '../../types/doctor';
import { Clinic } from '../../types/clinic';
import { HttpClient } from '@angular/common/http';
import { DoctorComponent } from '../../components/doctor/doctor';
import { LeafletUtil } from '../../types/leaflet';
import * as Leaflet from 'leaflet';

@Component({
  templateUrl: './clinic.html',
  styleUrl: './clinic.css',
  imports: [DoctorComponent],
})
export class ClinicView implements AfterViewInit, OnInit {
  private http = inject(HttpClient);
  private map: any;

  @ViewChild('map') mapElement!: ElementRef;

  @Input() clinic: Clinic = {
    _id: '1',
    name: 'The clinic',
    location: {
      latitude: 57.7089,
      longitude: 11.9746,
      city: 'Gothenburg',
      address: 'Plejadgatan 22',
      postCode: 41757,
    },
    doctors: ['1', '2'],
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

  ngOnInit(): void {
    this.map = Leaflet.map('map', {
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
  }

  ngAfterViewInit(): void {
    let currentRect!: DOMRectReadOnly;

    new ResizeObserver((observerEntry: Array<ResizeObserverEntry>) => {
      const rect = observerEntry[0].contentRect;

      if (rect != currentRect) {
        this.map.invalidateSize();
      }
    }).observe(this.mapElement.nativeElement);
  }
}
