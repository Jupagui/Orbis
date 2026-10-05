import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
    <div style={{ height: '280px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={centro} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conectar && linea.length > 1 && <Polyline positions={linea} pathOptions={{ color: '#B79CED', dashArray: '6 6' }} />}
        {origen && (
          <CircleMarker center={[origen.lat, origen.lon]} radius={9} pathOptions={{ color: '#fff', fillColor: '#6EA8FE', fillOpacity: 1, weight: 3 }}>
            <Popup>
              <strong>Tu ubicación</strong>
              <br />
              {origen.fuente === 'referencia' ? 'No confirmada (referencia)' : origen.texto}
            </Popup>
          </CircleMarker>
        )}
        {puntos.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lon]} radius={8} pathOptions={{ color: '#0B0D12', fillColor: '#C9A45C', fillOpacity: 1, weight: 2 }}>
            <Popup>
              <strong>{i + 1}. {p.nombre}</strong>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
