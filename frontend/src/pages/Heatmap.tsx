import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../services/api';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Badges';
import { Alert } from '../ui/Surfaces';
import { Icon } from '../ui/Icon';
import { OrbitSpinner } from '../ui/Surfaces';
import { TopoRadar } from '../ui/backgrounds/TopoRadar';
import { LISTA_MODULOS, moduloPorTipo } from '../ui/modules';
import { leerVar, useTema } from '../ui/theme';
import { vars } from '../ui/cls';

const FILTROS = [{ valor: 'todos', texto: 'Todos' }, ...LISTA_MODULOS.map((m) => ({ valor: m.key, texto: m.label }))];

export default function Heatmap() {
  const [casos, setCasos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [filtro, setFiltro] = useState<string>('todos');
  const navigate = useNavigate();
  useTema(); // los marcadores se repintan con los colores del tema activo

  useEffect(() => {
    const fetchCasos = async () => {
      try {
        const response = await apiClient.get('/casos/viales');
        setCasos(response.data);
      } catch (e) {
        console.error(e);
        setFallo(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCasos();
  }, []);

  const colorDe = (tipo: string) => {
    const m = moduloPorTipo(tipo);
    return (m && leerVar(m.accent)) || leerVar('--ok') || '#6FCF97';
  };

  const casosFiltrados = filtro === 'todos' ? casos : casos.filter((c) => moduloPorTipo(c.tipo)?.key === filtro);

  return (
    <div className="map-page">
      {loading ? (
        <div className="map-state">
          <div className="bg-local"><TopoRadar /></div>
          <div><OrbitSpinner grande etiqueta="Cargando el tablero" /><p className="muted">Cargando los casos…</p></div>
        </div>
      ) : (
        <MapContainer center={[4.65, -74.08]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {casosFiltrados.map((caso, idx) => {
            const color = colorDe(caso.tipo);
            return (
              <CircleMarker
                key={`${idx}-${color}`}
                center={[caso.lat, caso.lon]}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1 }}
                radius={6}
              >
                <Popup>
                  <div className="pop">
                    <strong>{moduloPorTipo(caso.tipo)?.label ?? caso.tipo}</strong>
                    {caso.descripcion}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}

      <aside className="map-panel glass" aria-label="Filtros del tablero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Tablero de calor</p>
            <h1>Casos en Bogotá</h1>
          </div>
          <Button variant="ghost" iconOnly icon="prev" aria-label="Volver al inicio" onClick={() => navigate('/')} />
        </div>
        <div className="legend" role="group" aria-label="Filtrar por módulo">
          {FILTROS.map((f) => {
            const m = moduloPorTipo(f.valor);
            return (
              <Chip key={f.valor} pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)} style={m ? vars({ '--accent': `var(${m.accent})` }) : undefined}>
                {m ? <span className="swatch" aria-hidden="true" /> : <Icon name="tablero" />}
                {f.texto}
              </Chip>
            );
          })}
        </div>
        <p className="small muted" aria-live="polite">
          <span className="count">{casosFiltrados.length}</span> {casosFiltrados.length === 1 ? 'caso' : 'casos'} con ubicación
        </p>
        {fallo && <Alert tone="danger" title="No se pudieron cargar los casos" role="alert"><p>Revisa que el servidor esté activo e inténtalo de nuevo.</p></Alert>}
      </aside>
    </div>
  );
}
