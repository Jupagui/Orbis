import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { getCasos } from '../services/api';

const COLOR_ESTADO: Record<string, string> = {
  completado: 'var(--success)',
  requiere_info: 'var(--warning)',
  procesando: 'var(--info)',
  error: 'var(--danger)',
};

export default function Historial() {
  const navigate = useNavigate();
  const { data: casos, isLoading } = useQuery({ queryKey: ['casos'], queryFn: getCasos });

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ padding: '0.8rem 2%', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Historial de casos</h1>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 2%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isLoading && <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '2rem auto' }} />}
        {casos?.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aún no hay casos registrados.</p>}
        {casos?.map((c: any) => (
          <button key={c.id} onClick={() => navigate(`/casos/${c.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1rem', backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, backgroundColor: COLOR_ESTADO[c.estado] || 'var(--border)' }} title={c.estado} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descripcion}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {c.tipo} · {c.estado.replace('_', ' ')} · {new Date(c.creado_en + 'Z').toLocaleString('es-CO')}
              </div>
            </div>
            {c.tiene_imagen && <ImageIcon size={16} color="var(--text-muted)" />}
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
        ))}
      </main>
    </div>
  );
}
