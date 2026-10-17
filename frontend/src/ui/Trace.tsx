import { useId, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cls, vars } from './cls';

/** Fila expandible. El encabezado es un botón con aria-expanded. */
export function Accordion({ abierto, onToggle, cabecera, children, tool }: { abierto: boolean; onToggle: () => void; cabecera: ReactNode; children: ReactNode; tool?: boolean }) {
  const id = useId();
  return (
    <div className={cls('acc', tool && 'is-tool')}>
      <button type="button" className="acc-btn" aria-expanded={abierto} aria-controls={id} onClick={onToggle}>
        <Icon name="chevron" className="chev" />
        {cabecera}
      </button>
      {abierto && <div id={id} className="acc-body">{children}</div>}
    </div>
  );
}

export type TipoPaso = 'agent' | 'tool' | 'decision' | 'error';

/** Un paso de la traza: punto con forma según el tipo (círculo, círculo verde, rombo, rojo). */
export function TimelineStep({ n, tipo, nombre, aparte, ms }: { n: number; tipo: TipoPaso; nombre: string; aparte?: string; ms: number }) {
  return (
    <>
      <span className="step-n">{n}</span>
      <span className={cls('step-dot', tipo === 'agent' ? '' : tipo)} aria-hidden="true" />
      <span className="step-name">
        <strong style={{ fontWeight: tipo === 'tool' ? 400 : 500 }}>{nombre}</strong>
        {aparte && <small>· {aparte}</small>}
      </span>
      <span className="step-ms">{ms} ms</span>
    </>
  );
}

interface EtapaTraza { agente: string; herramienta: string | null; estado: string }

const ETAPAS: { clave: string; agentes: string[]; nombre: string; detalle: string; icono: IconName }[] = [
  { clave: 'triage', agentes: ['TriageAgent'], nombre: 'Triage', detalle: 'Clasifica el caso y evalúa la información (texto + imagen)', icono: 'triage' },
  { clave: 'geo', agentes: ['GeoAgent'], nombre: 'Geo', detalle: 'Resuelve la ubicación y busca reportes cercanos', icono: 'geo' },
  { clave: 'dominio', agentes: ['VialAgent', 'SaludAgent', 'TallerAgent', 'SaborAgent', 'ExploraAgent'], nombre: 'Agente especializado', detalle: 'Consulta datos propios y mapas, y ejecuta la acción', icono: 'orbita' },
  { clave: 'verif', agentes: ['VerificadorAgent'], nombre: 'Verificador', detalle: 'Control de calidad, prioridad y mensaje de emergencia', icono: 'sello' },
];

/** Etapas del pipeline. Si ya hay trazas, marca las etapas que aparecen en ellas; si no, solo recorre las etapas en bucle. */
export function AgentStepper({ trazas }: { trazas?: EtapaTraza[] }) {
  return (
    <ol className="stepper" aria-label="Etapas del análisis">
      {ETAPAS.map((e, i) => {
        const hecha = !!trazas?.some((t) => e.agentes.includes(t.agente) && !t.herramienta);
        return (
          <li key={e.clave} className={cls(hecha ? 'is-done' : 'is-scan')} style={vars({ '--d': `${i * 1.6}s` })}>
            <span className="node"><Icon name={hecha ? 'check' : e.icono} /></span>
            <span><b>{e.nombre}</b><small>{e.detalle}</small></span>
            {hecha && <span className="pill ok">listo</span>}
          </li>
        );
      })}
    </ol>
  );
}
