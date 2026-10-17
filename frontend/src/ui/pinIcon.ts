import L from 'leaflet';
import { pinHtml, type TipoPin } from './pinShape';

export const pinIcon = (tipo: TipoPin, n?: number) =>
  L.divIcon({
    html: pinHtml(tipo, n),
    className: 'orbis-pin',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
