import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCasos, PRIORIDADES } from '../services/api';
import { Button } from '../ui/Button';
import { PriorityMeter, StatusPill } from '../ui/Badges';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Inputs';
import { EmptyState, Skeleton } from '../ui/Surfaces';
import { vars } from '../ui/cls';
import { moduloPorTipo } from '../ui/modules';

type Orden = 'recientes' | 'prioridad';

const ORDENES: { valor: Orden; texto: string }[] = [
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'prioridad', texto: 'Por prioridad' },
];

function Esqueleto() {
  return (
    <div className="hist-skel" aria-hidden="true">
      <Skeleton className="circle" />
      <div><Skeleton ancho="70%" /><Skeleton ancho="40%" /></div>
    </div>
  );
}

export default function Historial() {
  const navigate = useNavigate();
  const [orden, setOrden] = useState<Orden>('recientes');
  const { data: casos, isLoading } = useQuery({ queryKey: ['casos', orden], queryFn: () => getCasos(orden) });

  return (
    <div className="page wide">
      <header className="page-head">
        <Button variant="ghost" icon="prev" onClick={() => navigate('/')} style={{ justifySelf: 'start' }}>Volver</Button>
        <p className="eyebrow">Persistencia</p>
        <h1 className="title" style={{ fontSize: 'var(--fs-6)' }}>Historial de casos</h1>
        <p className="muted small">Cada caso procesado queda guardado con su resultado, la acción realizada y la traza.</p>
      </header>

      <Segmented etiqueta="Ordenar casos" opciones={ORDENES} valor={orden} onChange={setOrden} />

      <div className="hist" aria-busy={isLoading}>
        {isLoading && <><Esqueleto /><Esqueleto /><Esqueleto /></>}
        {casos?.length === 0 && (
          <EmptyState icon="historial" title="Aún no hay casos registrados" action={<Button onClick={() => navigate('/')} icon="next">Crear el primero</Button>}>
            Cuando analices una solicitud aparecerá aquí.
          </EmptyState>
        )}
        {casos?.map((c: any) => {
          const prioridad = PRIORIDADES[c.prioridad] || PRIORIDADES.normal;
          const modulo = moduloPorTipo(c.tipo);
          return (
            <button
              key={c.id}
              type="button"
              className="hist-row"
              style={vars({ '--prio': prioridad.color, '--accent': modulo ? `var(${modulo.accent})` : 'var(--muted)' })}
              onClick={() => navigate(`/casos/${c.id}`)}
            >
              <span className="ico"><Icon name={modulo?.icon ?? 'orbita'} /></span>
              <span className="txt">
                <b>{c.descripcion}</b>
                <span>{modulo?.label ?? c.tipo} · {new Date(c.creado_en + 'Z').toLocaleString('es-CO')}</span>
              </span>
              <span className="end">
                <StatusPill estado={c.estado} />
                <span className="hide-sm"><PriorityMeter prioridad={c.prioridad} /></span>
                {c.tiene_imagen && <Icon name="imagen" title="Tiene imagen" />}
                <Icon name="chevron" className="go" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
