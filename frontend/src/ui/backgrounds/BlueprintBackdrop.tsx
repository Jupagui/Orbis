import { useRef } from 'react';
import { useAnimatedSvg } from './useAnimatedSvg';
import { vars } from '../cls';

const CABLES = [
  { d: 'M0 192H320V352H640V160H960V320H1600', t: 11, delay: 0, sage: false },
  { d: 'M0 704H224V544H544V736H896V576H1280V704H1600', t: 14, delay: -5, sage: true },
  { d: 'M480 0V96H800V448H1120V64H1408V0', t: 9, delay: -2, sage: false },
  { d: 'M1600 448H1344V832H992V640H704V900', t: 12, delay: -7, sage: true },
  { d: 'M0 448H128V256H256', t: 6, delay: -1, sage: false },
];
const NODOS = [[317, 349], [637, 157], [797, 445], [1117, 61], [893, 733], [1341, 445]];

/** Plano técnico: paquetes de datos que recorren los cables entre nodos. */
export function BlueprintBackdrop() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  return (
    <svg ref={ref} className="bgs" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="bp-a" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" style={{ stroke: 'var(--grid-line)' }} /></pattern>
        <pattern id="bp-b" width="160" height="160" patternUnits="userSpaceOnUse"><path d="M160 0H0V160" fill="none" style={{ stroke: 'var(--grid-line-strong)' }} /></pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#bp-a)" />
      <rect width="1600" height="900" fill="url(#bp-b)" />
      {CABLES.map((c) => <path key={`w${c.d}`} className="wire" d={c.d} />)}
      {CABLES.map((c) => (
        <path key={`p${c.d}`} className={c.sage ? 'pkt sage' : 'pkt'} pathLength={1000} d={c.d} style={vars({ '--t': `${c.t}s`, '--d': `${c.delay}s` })} />
      ))}
      {NODOS.map(([x, y], i) => (
        <rect key={i} className="jn" x={x} y={y} width="6" height="6" style={vars({ '--d': `${-0.4 - i * 0.4}s` })} />
      ))}
      <text className="lbl" x="1328" y="300">POST /api/v1/casos</text>
      <text className="lbl" x="232" y="530">202 · BackgroundTasks</text>
    </svg>
  );
}
