import * as Leaflet from 'leaflet';

export class LeafletUtil {
  public static readonly marker = Leaflet.icon({
    iconUrl: './assets/mapMarker.png',

    iconSize: [50, 50], // size of the icon
    iconAnchor: [25, 25], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -2], // point from which the popup should open relative to the iconAnchor
  });
}
