import { Icon } from './Icon';
import { Pill } from './Badges';
import { btnClass } from './cls';
import { formatoDistancia } from './format';

export interface Lugar {
  nombre: string;
  motivo?: string;
  descripcion?: string;
  telefono?: string;
  precio_promedio?: number;
  precio_verificado?: boolean;
  minutos_sugeridos?: number;
  ruta_verificada?: boolean;
  distancia_m: number;
  duracion_s: number;
  modo?: string;
  fuente?: string;
  lat?: number | null;
  lon?: number | null;
}

/** Un lugar recomendado con su ruta. La distancia solo se muestra como real si la confirmó el servicio de mapas. */
export function PlaceCard({ lugar, n }: { lugar: Lugar; n: number }) {
  return (
    <article className="place">
      <h4><span className="n" aria-hidden="true">{n}</span>{lugar.nombre}</h4>
      {(lugar.motivo || lugar.descripcion) && <p>{lugar.motivo || lugar.descripcion}</p>}
      {lugar.telefono && <p className="small">Tel: <span className="mono">{lugar.telefono}</span></p>}
      {lugar.precio_promedio && (
        <p className="small">
          Precio promedio: ${lugar.precio_promedio.toLocaleString('es-CO')} {lugar.precio_verificado ? '(verificado)' : '(sin verificar)'}
        </p>
      )}
      {lugar.minutos_sugeridos ? <p className="small">Visita sugerida: {lugar.minutos_sugeridos} min</p> : null}
      <div className="route">
        {lugar.ruta_verificada ? (
          <>
            <b>{formatoDistancia(lugar.distancia_m)}</b>·<b>{Math.round(lugar.duracion_s / 60)} min</b>
            {lugar.modo === 'drive' ? 'en carro' : lugar.modo === 'walk' ? 'a pie' : ''}
            <Pill tone="ok">ruta real</Pill>
          </>
        ) : (
          <Pill tone="warn">Distancia no confirmada</Pill>
        )}
        {lugar.fuente && <span>· fuente: {lugar.fuente}</span>}
      </div>
      {lugar.lat && lugar.lon && (
        <a
          className={btnClass('secondary')}
          style={{ minHeight: '2.25rem', justifySelf: 'start' }}
          href={`https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lon}`}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="ruta" /> Cómo llegar
        </a>
      )}
    </article>
  );
}
