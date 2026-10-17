import { useRef } from 'react';
import { useAnimatedSvg } from './useAnimatedSvg';
import { vars } from '../cls';

const CARRILES = [130, 230, 330, 430, 530, 630, 730, 830];

/** Sello rotatorio (caso, resultado, acción, traza) sobre carriles por los que pasan eventos. */
export function SealTrace() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  return (
    <svg ref={ref} className="bgs" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="st-ticks" width="120" height="14" patternUnits="userSpaceOnUse">
          <path d="M1 2V12M23 5V9M47 4V10M71 0V14M95 5V9" style={{ stroke: 'var(--gold)', strokeOpacity: 0.35 }} strokeWidth="1.2" />
        </pattern>
        <path id="st-seal" d="M1290 640m-170 0a170 170 0 1 1 340 0a170 170 0 1 1 -340 0" />
      </defs>
      {CARRILES.map((y, i) => (
        <g key={y}>
          <line className="lane" x1="0" x2="1600" y1={y} y2={y} />
          <g className="tickrow" style={vars({ '--t': `${6 + (i % 4) * 2.5}s` })}><rect x="0" y={y - 7} width="1840" height="14" fill="url(#st-ticks)" /></g>
          <g className="evt" style={vars({ '--t': `${(12 + i * 1.7).toFixed(1)}s`, '--d': `${(-i * 2.3).toFixed(1)}s` })}>
            <rect x="-5" y={y - 5} width="10" height="10" transform={`rotate(45 0 ${y})`} style={{ fill: i % 3 === 1 ? 'var(--sage)' : 'var(--gold)' }} />
          </g>
        </g>
      ))}
      <g className="rot" style={vars({ '--o': '1290px 640px', '--t': '90s' })}>
        <text className="seal-text"><textPath href="#st-seal" textLength="1060" lengthAdjust="spacing">CASO · RESULTADO · ACCIÓN · TRAZA · CHAT · PERSISTENCIA · </textPath></text>
      </g>
      <circle className="orb" cx="1290" cy="640" r="196" />
      <circle className="orb dash" cx="1290" cy="640" r="146" />
      <g className="rot rev" style={vars({ '--o': '1290px 640px', '--t': '30s' })}>
        <ellipse className="orb sage" cx="1290" cy="640" rx="120" ry="40" transform="rotate(-22 1290 640)" />
        <circle className="planet" cx="1401" cy="595" r="5" />
      </g>
      <circle className="orb" cx="1290" cy="640" r="44" style={{ strokeOpacity: 0.7 }} />
      <circle className="planet" cx="1290" cy="640" r="5" />
    </svg>
  );
}
