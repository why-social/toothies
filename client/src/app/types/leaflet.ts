import * as Leaflet from 'leaflet';

export class LeafletUtil {
  public static readonly marker = Leaflet.icon({
    iconUrl: './assets/mapMarker.png',

    iconSize: [34, 51], // size of the icon
    iconAnchor: [17, 51], // point of the icon which will correspond to marker's location
    popupAnchor: [17, 0], // point from which the popup should open relative to the iconAnchor
  });
}
