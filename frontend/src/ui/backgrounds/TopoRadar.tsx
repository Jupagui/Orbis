import { useRef } from 'react';
import { useAnimatedSvg } from './useAnimatedSvg';
import { vars } from '../cls';

const ESCALAS = [
  { r: 0, s: 0.55 }, { r: 9, s: 1 }, { r: -7, s: 1.5 }, { r: 15, s: 2.05 }, { r: 4, s: 2.6 }, { r: -12, s: 3.2 }, { r: 20, s: 3.85 }, { r: -3, s: 4.6 },
];
const ECOS = [
  { x: 1268, y: 402, d: 0, sage: false }, { x: 1040, y: 560, d: 1, sage: true }, { x: 1390, y: 650, d: 1.9, sage: false },
];

/** Curvas de nivel de los cerros orientales y un radar de búsqueda de 2, 8 y 25 km. */
export function TopoRadar() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  return (
    <svg ref={ref} className="bgs" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <path id="tr-blob" vectorEffect="non-scaling-stroke" d="M0 -100C48 -104 96 -66 104 -12C112 44 74 96 14 104C-46 112 -102 76 -108 18C-114 -40 -58 -96 0 -100Z" />
        <linearGradient id="tr-sweep" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0.22 }} />
        </linearGradient>
      </defs>
      <g className="rot" style={vars({ '--o': '1180px 470px', '--t': '240s' })}>
        {ESCALAS.map((e) => <use key={e.s} href="#tr-blob" className="topo" transform={`translate(1180 470) rotate(${e.r}) scale(${e.s})`} />)}
      </g>
      <g className="rot rev" style={vars({ '--o': '300px 760px', '--t': '200s' })}>
        {[[0, 0.5], [14, 0.95], [-9, 1.45], [22, 2]].map(([r, s]) => <use key={s} href="#tr-blob" className="topo sage" transform={`translate(300 760) rotate(${r}) scale(${s})`} />)}
      </g>
      {[110, 230, 400].map((r) => <circle key={r} className="ring" cx="1180" cy="470" r={r} />)}
      <text className="lbl" x="1180" y="352" textAnchor="middle">2 km</text>
      <text className="lbl" x="1180" y="232" textAnchor="middle">8 km</text>
      <text className="lbl" x="1180" y="62" textAnchor="middle">25 km</text>
      <g className="rot" style={vars({ '--o': '1180px 470px', '--t': '8s' })}><path d="M1180 470L1180 70A400 400 0 0 1 1463 187Z" fill="url(#tr-sweep)" /></g>
      {ECOS.map((e) => (
        <g key={e.x}>
          <circle cx={e.x} cy={e.y} r="4" className={e.sage ? 'planet sage' : 'planet'} />
          <circle cx={e.x} cy={e.y} r="4" fill="none" style={{ stroke: e.sage ? 'var(--sage)' : 'var(--gold)' }}>
            <animate attributeName="r" values="4;26" dur="2.8s" begin={`${e.d}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values=".8;0" dur="2.8s" begin={`${e.d}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
      <circle cx="1180" cy="470" r="6" className="planet" />
    </svg>
  );
}
