import {
  Component,
  Input,
  OnInit,
  AfterViewChecked,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Clinic } from '../../components/clinic/clinic.interface';
import { HttpClient } from '@angular/common/http';
import { DoctorComponent } from '../../components/doctor/doctor.component';
import { LeafletUtil } from '../../types/leaflet.interface';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import * as Leaflet from 'leaflet';

@Component({
  templateUrl: './clinic.html',
  styleUrl: './clinic.css',
  imports: [DoctorComponent, MatIcon, MatProgressBarModule, MatButtonModule],
})
export class ClinicView implements AfterViewChecked, OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  protected router = inject(Router);

  @ViewChild('map') mapElement!: ElementRef;
  @Input() clinic!: Clinic | null;
  private marker!: Leaflet.Marker;
  private map!: Leaflet.Map;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const identifier = params.get('id');

      if (!identifier) {
        return;
      }

      this.http
        .get<Array<any>>(`http://localhost:3000/clinics/${identifier}`)
        .subscribe({
          next: (data: any) => {
            data = data[0];

            if (
              data &&
              data.name &&
              data._id &&
              data.location &&
              data.location.latitude &&
              data.location.longitude &&
              data.location.city &&
              data.location.address &&
              data.doctors
            ) {
              data.doctors = data.doctors.filter(
                (el: any) => el.name && el._id && el.type,
              );

              this.clinic = {
                name: data.name,
                _id: data._id,
                location: data.location,
                doctors: data.doctors,
              } as Clinic;

              if (this.marker && this.map) {
                this.marker.removeFrom(this.map);
              }

              this.marker = Leaflet.marker(
                [this.clinic.location.latitude, this.clinic.location.longitude],
                { icon: LeafletUtil.marker },
              );

              if (this.map) {
                this.marker.addTo(this.map);
                this.map.panTo(this.marker.getLatLng());
              }
            } else {
              this.clinic = null;
            }
          },
          error: (error) => {
            console.error('Error fetching clinic: ', error);
          },
        });
    });
  }

  ngAfterViewChecked(): void {
    if (this.mapElement && !this.map) {
      const center: Leaflet.LatLngExpression = [57.7089, 11.9746]; // Gothenburg
      this.map = Leaflet.map(this.mapElement.nativeElement, {
        maxBounds: Leaflet.latLngBounds(
          Leaflet.latLng(center[0] - 0.8, center[1] - 1),
          Leaflet.latLng(center[0] + 1.5, center[1] + 3),
        ),
        center: center,
        zoom: 15,
      });

      Leaflet.tileLayer(
        'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        {
          maxZoom: 18,
          minZoom: 9,
        },
      ).addTo(this.map);

      if (this.marker) {
        this.marker.addTo(this.map);
        this.map.panTo(this.marker.getLatLng());
      }
    }
  }
}
