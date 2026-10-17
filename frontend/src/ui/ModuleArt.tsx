import type { ModuloKey } from './modules';

/** Ilustración animada de cada módulo (reemplaza las fotos externas). Toma el color de --accent. */
export function ModuleArt({ modulo }: { modulo: ModuloKey }) {
  return (
    <svg className="ma" viewBox="0 0 160 96" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {modulo === 'vial' && (
        <>
          <path className="soft" d="M58 14H102L152 92H8Z" />
          <path className="s ma-lane" d="M80 20V92" />
          <path className="s" d="M52 74c8-8 26-12 44-10 18 2 32 7 33 15 1 9-19 14-42 14-24 0-44-8-35-19Z" style={{ fill: 'var(--bg)' }} />
          <path className="s" d="M70 70l6-6 4 4M104 72l5-6" />
          <g className="ma-cone">
            <path className="fillc" d="M121 52l7-26 7 26Z" />
            <path className="s" d="M117 54h22" />
            <path d="M123.4 42h9.2" stroke="var(--bg)" strokeWidth="2.2" fill="none" />
          </g>
        </>
      )}
      {modulo === 'salud' && (
        <>
          <path className="dim" d="M4 80H156M4 48H156M4 16H156" strokeDasharray="1 7" />
          <path className="dim" d="M20 6V90M60 6V90M100 6V90M140 6V90" strokeDasharray="1 7" />
          <path className="s ma-ecg" pathLength={100} strokeWidth={2.4} d="M4 52h34l8-26 12 52 10-34 6 8h82" />
          <circle className="gold" cx="152" cy="52" r="3" />
        </>
      )}
      {modulo === 'taller' && (
        <>
          <path className="dim" d="M8 84h144" strokeDasharray="2 6" />
          <g className="ma-nut">
            <path className="soft" d="M80 14l30 17.4.1 35L80 84 50 66.4l.1-35Z" />
            <circle className="s" cx="80" cy="49" r="13" />
          </g>
          <circle className="gold" cx="80" cy="49" r="3.4" />
          <path className="s" d="M126 22c8 0 14 6 14 14M26 60c-6 0-10-4-10-10" />
        </>
      )}
      {modulo === 'comida' && (
        <>
          <path className="soft" d="M22 56c18-1 98-1 116 0-2 18-20 32-58 32S24 74 22 56Z" />
          <path className="s" d="M62 92h36" />
          <path className="s ma-steam" d="M64 44c-6-7 5-12 0-20" />
          <path className="s ma-steam" style={{ animationDelay: '0.9s' }} d="M80 42c-6-8 5-14 0-24" />
          <path className="s ma-steam" style={{ animationDelay: '1.8s' }} d="M96 44c-6-7 5-12 0-20" />
          <circle className="gold" cx="112" cy="68" r="3" />
        </>
      )}
      {modulo === 'explora' && (
        <>
          <path className="soft" d="M4 90l46-52 16 16 28-36 62 72Z" />
          <path className="dim" d="M14 84L128 22" strokeDasharray="3 4" />
          <g className="ma-cabin">
            <path className="s" d="M14 84v-4" />
            <rect x="8" y="76" width="14" height="10" rx="2" style={{ fill: 'var(--bg)' }} className="s" />
            <circle className="gold" cx="15" cy="81" r="2" />
          </g>
          <circle className="fillc" cx="128" cy="22" r="3" />
        </>
      )}
    </svg>
  );
}
