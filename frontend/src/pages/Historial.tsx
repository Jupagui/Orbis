import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { getCasos, PRIORIDADES } from '../services/api';

const COLOR_ESTADO: Record<string, string> = {
  completado: 'var(--success)',
  requiere_info: 'var(--warning)',
  procesando: 'var(--info)',
  error: 'var(--danger)',
};

type Orden = 'recientes' | 'prioridad';

export default function Historial() {
  const navigate = useNavigate();
  const [orden, setOrden] = useState<Orden>('recientes');
  const { data: casos, isLoading } = useQuery({ queryKey: ['casos', orden], queryFn: () => getCasos(orden) });

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ padding: '0.8rem 2%', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Historial de casos</h1>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 2%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div role="group" aria-label="Ordenar casos" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {([['recientes', 'Más recientes'], ['prioridad', 'Por prioridad']] as [Orden, string][]).map(([valor, texto]) => (
            <button key={valor} onClick={() => setOrden(valor)} aria-pressed={orden === valor}
              style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem',
                border: '1px solid var(--border)',
                backgroundColor: orden === valor ? 'var(--primary)' : 'var(--surface-1)',
                color: orden === valor ? 'var(--on-primary)' : 'var(--text)' }}>
              {texto}
            </button>
          ))}
        </div>

        {isLoading && <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '2rem auto' }} />}
        {casos?.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aún no hay casos registrados.</p>}
        {casos?.map((c: any) => {
          const prioridad = PRIORIDADES[c.prioridad] || PRIORIDADES.normal;
          return (
            <button key={c.id} onClick={() => navigate(`/casos/${c.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: `4px solid ${prioridad.color}`, borderRadius: 'var(--radius-md)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: COLOR_ESTADO[c.estado] || 'var(--border)' }} title={c.estado} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descripcion}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {c.tipo} · {c.estado.replace('_', ' ')} · {new Date(c.creado_en + 'Z').toLocaleString('es-CO')}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: prioridad.color, whiteSpace: 'nowrap' }}>
                {prioridad.texto}
              </span>
              {c.tiene_imagen && <ImageIcon size={16} color="var(--text-muted)" aria-label="Tiene imagen" />}
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          );
        })}
      </main>
    </div>
  );
}
