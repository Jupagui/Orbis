import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Map as MapIcon, Loader2 } from 'lucide-react';
import { apiClient } from '../services/api';

export default function Heatmap() {
  const [casos, setCasos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCasos = async () => {
      try {
        const response = await apiClient.get('/casos/viales');
        setCasos(response.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCasos();
  }, []);

  const getMarkerColor = (tipo: string) => {
    switch (tipo) {
      case 'vial': return '#f43f5e';
      case 'salud': return '#3b82f6';
      case 'comida': 
      case 'sabor': return '#f59e0b';
      case 'taller': return '#64748b';
      case 'explora': return '#8b5cf6';
      default: return '#4ade80';
    }
  };

  const casosFiltrados = filtro === 'todos' ? casos : casos.filter(c => c.tipo === filtro || (filtro === 'sabor' && c.tipo === 'comida'));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ padding: '0.8rem 2%', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon size={18} /> Tablero
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['todos', 'vial', 'salud', 'sabor', 'taller', 'explora'].map(t => (
            <button 
              key={t}
              onClick={() => setFiltro(t)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: filtro === t ? getMarkerColor(t) : 'var(--surface-2)',
                color: filtro === t ? '#fff' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textTransform: 'uppercase'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          </div>
        ) : (
          <MapContainer center={[4.65, -74.08]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {casosFiltrados.map((caso, idx) => (
              <CircleMarker
                key={idx}
                center={[caso.lat, caso.lon]}
                pathOptions={{ color: getMarkerColor(caso.tipo), fillColor: getMarkerColor(caso.tipo), fillOpacity: 0.8, weight: 1 }}
                radius={6}
              >
                <Popup>
                  <div style={{ color: '#000', fontFamily: 'Century Gothic, sans-serif' }}>
                    <strong style={{ textTransform: 'uppercase' }}>{caso.tipo}</strong><br/>
                    {caso.descripcion}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </main>
    </div>
  );
}
