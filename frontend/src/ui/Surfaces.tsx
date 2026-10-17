import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cls } from './cls';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  feature?: boolean;
  flat?: boolean;
  interactive?: boolean;
}

export function Card({ as: Tag = 'section', feature, flat, interactive, className, children, ...resto }: CardProps) {
  return (
    <Tag className={cls('card', feature && 'feature', flat && 'flat', interactive && 'is-interactive', className)} {...resto}>
      {children}
    </Tag>
  );
}

export function CardHeader({ icon, title, level = 2, aside }: { icon?: IconName; title: ReactNode; level?: 2 | 3; aside?: ReactNode }) {
  const H = `h${level}` as 'h2' | 'h3';
  return (
    <div className="card-h">
      {icon && <Icon name={icon} size="lg" />}
      <H>{title}</H>
      {aside && <span className="push">{aside}</span>}
    </div>
  );
}

const ICONO_TONO: Record<string, IconName> = { ok: 'check', warn: 'alerta', danger: 'alerta', info: 'info' };

/** Mensaje persistente dentro del contenido. */
export function Alert({ tone, title, children, role }: { tone: 'ok' | 'warn' | 'danger' | 'info'; title: ReactNode; children?: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div className={cls('alert', tone)} role={role}>
      <Icon name={ICONO_TONO[tone]} />
      <div className="body">
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}

export function Stat({ valor, etiqueta }: { valor: ReactNode; etiqueta: string }) {
  return (
    <div className="stat">
      <span className="num">{valor}</span>
      <span className="lbl">{etiqueta}</span>
    </div>
  );
}

export function EmptyState({ icon = 'orbita', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Ornament() {
  return <div className="ornament" role="separator"><i /></div>;
}

export function Skeleton({ ancho, className }: { ancho?: string; className?: string }) {
  return <span className={cls('skel', className)} style={ancho ? { width: ancho } : undefined} aria-hidden="true" />;
}

export function Progress({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="progress" role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <i style={{ transform: `scaleX(${v})` }} />
    </div>
  );
}

export function OrbitSpinner({ grande, etiqueta = 'Cargando' }: { grande?: boolean; etiqueta?: string }) {
  return <span className={cls('spin-orbit', grande && 'lg')} role="status" aria-label={etiqueta} />;
}
