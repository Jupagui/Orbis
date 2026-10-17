import { useMemo, useRef } from 'react';
import { useAnimatedSvg } from './useAnimatedSvg';
import { vars } from '../cls';

// Generador con semilla fija: la constelación es la misma en cada visita.
function prng(semilla: number) {
  let s = semilla;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Enlace { d: string; paquete: boolean; sage: boolean; t: number; delay: number }
interface Estrella { x: number; y: number; r: number; sage: boolean; halo: boolean; delay: number }

function generar() {
  const rnd = prng(20261017);
  const puntos = Array.from({ length: 26 }, () => ({ x: 80 + rnd() * 1480, y: 60 + rnd() * 800 }));
  const vistos = new Set<string>();
  const enlaces: Enlace[] = [];
  puntos.forEach((p, i) => {
    puntos
      .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        const clave = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (vistos.has(clave)) return;
        vistos.add(clave);
        const q = puntos[j];
        const mx = (p.x + q.x) / 2 + (rnd() - 0.5) * 60;
        const my = (p.y + q.y) / 2 + (rnd() - 0.5) * 60;
        enlaces.push({
          d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`,
          paquete: rnd() > 0.45, sage: rnd() > 0.6, t: 4 + rnd() * 6, delay: -rnd() * 6,
        });
      });
  });
  const estrellas: Estrella[] = puntos.map((p, i) => ({ x: p.x, y: p.y, r: 2 + rnd() * 2.5, sage: i % 4 === 0, halo: i % 3 === 0, delay: -rnd() * 4 }));
  return { enlaces, estrellas };
}

/** Constelación de agentes: nodos conectados por los que viajan mensajes. */
export function Constellation() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  const { enlaces, estrellas } = useMemo(() => generar(), []);
  return (
    <svg ref={ref} className="bgs" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g className="float">
        {enlaces.map((e, i) => <path key={`l${i}`} className="lnk" d={e.d} />)}
        {enlaces.filter((e) => e.paquete).map((e, i) => (
          <path key={`k${i}`} className={e.sage ? 'pkt sage' : 'pkt'} pathLength={1000} d={e.d} style={vars({ '--t': `${e.t.toFixed(1)}s`, '--d': `${e.delay.toFixed(1)}s` })} />
        ))}
        {estrellas.map((s, i) => (
          <g key={i}>
            <circle className={s.sage ? 'node sage' : 'node'} cx={s.x} cy={s.y} r={s.r.toFixed(1)} />
            {s.halo && <circle className="halo" cx={s.x} cy={s.y} r="6" style={vars({ '--d': `${s.delay.toFixed(1)}s` })} />}
          </g>
        ))}
      </g>
    </svg>
  );
}
