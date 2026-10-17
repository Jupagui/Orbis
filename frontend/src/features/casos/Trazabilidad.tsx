import { useState } from 'react';
import { Pill } from '../../ui/Badges';
import { Card, CardHeader } from '../../ui/Surfaces';
import { Accordion, TimelineStep, type TipoPaso } from '../../ui/Trace';

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

/** Las decisiones del orquestador guardan siguiente_nodo y motivo en su salida. */
function motivoDecision(t: Traza): string | undefined {
  try {
    const salida = JSON.parse(t.salida ?? '{}');
    return typeof salida?.motivo === 'string' ? salida.motivo : undefined;
  } catch {
    return undefined;
  }
}

export default function Trazabilidad({ trazas }: { trazas: Traza[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  if (!trazas?.length) return null;

  const agentes = new Set(trazas.map((t) => t.agente)).size;
  const herramientas = trazas.filter((t) => t.herramienta).length;

  return (
    <Card>
      <CardHeader icon="traza" title="¿Cómo se obtuvo este resultado?" />
      <p className="small muted" style={{ marginBottom: 'var(--sp-2)' }}>
        {agentes} agentes y {herramientas} llamadas a herramientas, en orden de ejecución. Toca un paso para ver qué recibió y qué devolvió.
      </p>

      <ol className="trace-list">
        {trazas.map((t) => {
          const esHerramienta = !!t.herramienta;
          const esDecision = t.agente.startsWith('Orquestador');
          const ok = t.estado === 'completed';
          const tipo: TipoPaso = !ok ? 'error' : esDecision ? 'decision' : esHerramienta ? 'tool' : 'agent';
          const motivo = esDecision ? motivoDecision(t) : undefined;
          return (
            <li key={t.orden} className={esHerramienta ? 'indent' : undefined}>
              <Accordion
                tool={esHerramienta}
                abierto={abierta === t.orden}
                onToggle={() => setAbierta(abierta === t.orden ? null : t.orden)}
                cabecera={
                  <>
                    <TimelineStep n={t.orden} tipo={tipo} nombre={esHerramienta ? t.herramienta! : t.agente} aparte={esHerramienta ? t.agente : motivo} ms={t.duracion_ms} />
                    {!ok && <Pill tone="danger">Error</Pill>}
                  </>
                }
              >
                {[['Entrada', t.entrada], ['Salida', t.salida]].map(([titulo, valor]) => (
                  <div key={titulo}>
                    <h4>{titulo}</h4>
                    <pre className="code">{formatear(valor)}</pre>
                  </div>
                ))}
              </Accordion>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
