import { useRef } from 'react';
import { useAnimatedSvg } from './useAnimatedSvg';
import { vars } from '../cls';

/** Logo de órbitas sobre la retícula de calles y carreras de Bogotá (rotada, como el plano de la Candelaria). */
export function OrbitBackdrop() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  const centro = '1130px 440px';
  return (
    <svg ref={ref} className="bgs" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ob-grid" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-9)">
          <path d="M72 0H0V72" fill="none" style={{ stroke: 'var(--grid-line)' }} />
        </pattern>
        <radialGradient id="ob-glow">
          <stop offset="0" style={{ stopColor: 'var(--gold)', stopOpacity: 0.22 }} />
          <stop offset="0.55" style={{ stopColor: 'var(--gold)', stopOpacity: 0.05 }} />
          <stop offset="1" style={{ stopColor: 'var(--gold)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <g className="pan"><rect x="-300" y="-300" width="2300" height="1600" fill="url(#ob-grid)" /></g>
      <circle cx="1130" cy="440" r="480" fill="url(#ob-glow)" />
      <path className="hair" d="M1130 90V790M690 440H1570" />

      <g className="rot" style={vars({ '--o': centro, '--t': '160s' })}>
        <g transform="rotate(-18 1130 440)">
          <path id="ob-o1" className="orb" d="M570 440a560 170 0 1 0 1120 0a560 170 0 1 0 -1120 0" />
          <circle className="planet" r="6"><animateMotion dur="28s" repeatCount="indefinite"><mpath href="#ob-o1" /></animateMotion></circle>
        </g>
      </g>
      <g className="rot rev" style={vars({ '--o': centro, '--t': '110s' })}>
        <g transform="rotate(30 1130 440)">
          <path id="ob-o2" className="orb sage" d="M730 440a400 124 0 1 0 800 0a400 124 0 1 0 -800 0" />
          <circle className="planet sage" r="4.5"><animateMotion dur="17s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#ob-o2" /></animateMotion></circle>
        </g>
      </g>
      <g className="rot" style={vars({ '--o': centro, '--t': '90s' })}><circle className="orb dash" cx="1130" cy="440" r="250" /></g>
      <g className="rot rev" style={vars({ '--o': centro, '--t': '220s' })}>
        <g transform="rotate(8 1130 440)">
          <path id="ob-o4" className="orb faint" d="M420 440a710 270 0 1 0 1420 0a710 270 0 1 0 -1420 0" />
          <circle className="planet" r="3"><animateMotion dur="44s" repeatCount="indefinite"><mpath href="#ob-o4" /></animateMotion></circle>
        </g>
      </g>
      <circle className="orb" cx="1130" cy="440" r="118" style={{ strokeOpacity: 0.5 }} />
      <circle className="planet" cx="1130" cy="440" r="7" />
      {[0, 1.8].map((d) => (
        <circle key={d} cx="1130" cy="440" r="8" fill="none" style={{ stroke: 'var(--gold)' }}>
          <animate attributeName="r" values="8;96" dur="3.6s" begin={`${d}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values=".7;0" dur="3.6s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <text className="lbl" x="1130" y="612" textAnchor="middle">4.6097° N · 74.0817° O</text>
      <text className="lbl" x="1130" y="636" textAnchor="middle" style={{ opacity: 0.7 }}>2.640 m s. n. m.</text>
    </svg>
  );
}
