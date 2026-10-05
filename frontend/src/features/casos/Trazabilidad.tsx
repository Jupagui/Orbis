import { useState } from 'react';
import { GitBranch, Bot, Wrench, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

export interface Traza {
  orden: number;
  agente: string;
  herramienta: string | null;
  estado: string;
  duracion_ms: number;
  entrada: string | null;
  salida: string | null;
}

function formatear(json: string | null) {
  if (!json) return '';
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default function Trazabilidad({ trazas }: { trazas: Traza[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  if (!trazas?.length) return null;

  const agentes = new Set(trazas.map((t) => t.agente)).size;
  const herramientas = trazas.filter((t) => t.herramienta).length;

  return (
    <section style={{ backgroundColor: 'var(--surface-1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.3rem 0', fontSize: '1.1rem', color: 'var(--primary)' }}>
        <GitBranch size={18} /> ¿Cómo se obtuvo este resultado?
      </h2>
      <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {agentes} agentes y {herramientas} llamadas a herramientas, en orden de ejecución. Toca un paso para ver qué recibió y qué devolvió.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {trazas.map((t) => {
          const esHerramienta = !!t.herramienta;
          const ok = t.estado === 'completed';
          const expandida = abierta === t.orden;
          return (
            <li key={t.orden} style={{ marginLeft: esHerramienta ? '1.5rem' : 0 }}>
              <button
                onClick={() => setAbierta(expandida ? null : t.orden)}
                aria-expanded={expandida}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', background: esHerramienta ? 'transparent' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
              >
                {expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '1.5rem' }}>{t.orden}</span>
                {esHerramienta ? <Wrench size={14} color="var(--secondary)" /> : <Bot size={14} color="var(--primary)" />}
                <strong style={{ fontWeight: esHerramienta ? 400 : 600 }}>{esHerramienta ? t.herramienta : t.agente}</strong>
                {esHerramienta && <span style={{ color: 'var(--text-muted)' }}>· {t.agente}</span>}
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.duracion_ms} ms</span>
                {ok ? <CheckCircle2 size={14} color="var(--success)" /> : <XCircle size={14} color="var(--danger)" />}
              </button>
              {expandida && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem', margin: '0.3rem 0 0.5rem 0' }}>
                  {[['Entrada', t.entrada], ['Salida', t.salida]].map(([titulo, valor]) => (
                    <div key={titulo}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{titulo}</div>
                      <pre style={{ margin: 0, padding: '0.5rem', maxHeight: '220px', overflow: 'auto', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {formatear(valor)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
