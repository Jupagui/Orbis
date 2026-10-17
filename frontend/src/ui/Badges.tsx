import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PRIORIDADES } from '../services/api';
import { Icon, type IconName } from './Icon';
import { moduloPorTipo } from './modules';
import { cls, vars } from './cls';

/** Filtro o selección. Usa aria-pressed. */
export function Chip({ icon, pressed, className, children, ...resto }: { icon?: IconName; pressed?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cls('chip', className)} aria-pressed={pressed} {...resto}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/** Metadato que no se pulsa. */
export function Tag({ tone, icon, children }: { tone?: 'gold'; icon?: IconName; children: ReactNode }) {
  return (
    <span className={cls('tag', tone)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export type Tono = 'ok' | 'warn' | 'danger' | 'info' | 'gold' | 'neutral';

export function Pill({ tone = 'neutral', live, children }: { tone?: Tono; live?: boolean; children: ReactNode }) {
  return <span className={cls('pill', tone, live && 'live')}>{children}</span>;
}

const ESTADOS: Record<string, { tone: Tono; texto: string }> = {
  completado: { tone: 'ok', texto: 'Completado' },
  requiere_info: { tone: 'warn', texto: 'Requiere información' },
  procesando: { tone: 'info', texto: 'Procesando' },
  error: { tone: 'danger', texto: 'Error' },
};

/** Estado de un caso. Siempre lleva texto además del color. */
export function StatusPill({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { tone: 'neutral' as Tono, texto: estado.replace('_', ' ') };
  return <Pill tone={e.tone} live={estado === 'procesando'}>{e.texto}</Pill>;
}

const BARRAS: Record<string, string> = { critica: 'p4', alta: 'p3', media: 'p2', baja: 'p1' };

/** Prioridad que asigna el Verificador: barras + texto + color. */
export function PriorityMeter({ prioridad, prefijo }: { prioridad?: string | null; prefijo?: string }) {
  const p = PRIORIDADES[prioridad ?? ''] ?? PRIORIDADES.normal;
  return (
    <span className={cls('prio', prioridad && BARRAS[prioridad])}>
      <i aria-hidden="true"><b /><b /><b /><b /></i>
      {prefijo} {p.texto}
    </span>
  );
}

/** Etiqueta del módulo (Vía, Salud, Taller, Sabor, Explora). */
export function ModuleTag({ tipo }: { tipo?: string | null }) {
  const m = moduloPorTipo(tipo);
  if (!m) return null;
  return (
    <span className="mtag" style={vars({ '--accent': `var(${m.accent})` })}>
      <Icon name={m.icon} />
      {m.label}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

export function Avatar({ iniciales }: { iniciales: string }) {
  return <span className="avatar" aria-hidden="true">{iniciales}</span>;
}
