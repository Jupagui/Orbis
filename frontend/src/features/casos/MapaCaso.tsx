import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { pinIcon } from '../../ui/pinIcon';
import { leerVar, useTema } from '../../ui/theme';

interface Punto {
  nombre: string;
  lat?: number | null;
  lon?: number | null;
}

interface Props {
  origen?: { lat: number; lon: number; texto: string; fuente: string } | null;
  lugares: Punto[];
  conectar?: boolean; // dibuja la línea del recorrido (Explora)
}

export default function MapaCaso({ origen, lugares, conectar = false }: Props) {
  useTema(); // vuelve a leer los colores al cambiar el tema
  const puntos = lugares
    .filter((l) => l.lat != null && l.lon != null)
    .map((l) => ({ nombre: l.nombre, lat: l.lat as number, lon: l.lon as number }));
  if (!origen && puntos.length === 0) return null;

  const centro: [number, number] = origen ? [origen.lat, origen.lon] : [puntos[0].lat, puntos[0].lon];
  const linea: [number, number][] = [
    ...(origen ? [[origen.lat, origen.lon] as [number, number]] : []),
    ...puntos.map((p) => [p.lat, p.lon] as [number, number]),
  ];

  return (
    <div className="map-box" role="region" aria-label="Mapa del caso">
      <MapContainer center={centro} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conectar && linea.length > 1 && <Polyline positions={linea} pathOptions={{ color: leerVar('--m-explora') || '#B79CED', dashArray: '6 6', weight: 3 }} />}
        {origen && (
          <Marker position={[origen.lat, origen.lon]} icon={pinIcon('user')}>
            <Popup>
              <strong>Tu ubicación</strong>
              <br />
              {origen.fuente === 'referencia' ? 'No confirmada (referencia)' : origen.texto}
            </Popup>
          </Marker>
        )}
        {puntos.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lon]} icon={pinIcon('place', i + 1)}>
            <Popup>
              <strong>{i + 1}. {p.nombre}</strong>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
