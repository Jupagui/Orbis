import { CUERPO_PIN, type TipoPin } from './pinShape';

export type { TipoPin } from './pinShape';

/** Marcador de mapa. El dorado es siempre la ubicación del usuario. */
export function MapPin({ tipo, n }: { tipo: TipoPin; n?: number }) {
  return (
    <svg className={`pin ${tipo}`} viewBox="0 0 32 40" aria-hidden="true">
      {tipo === 'user' && <circle className="pulse" cx="16" cy="16.6" r="7" />}
      <path className="body" d={CUERPO_PIN} />
      {n != null ? <text x="16" y="21" textAnchor="middle">{n}</text> : <circle className="core" cx="16" cy="16.6" r="3.6" />}
    </svg>
  );
}
