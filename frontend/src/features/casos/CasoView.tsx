import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCaso, getTrazas, imagenCasoUrl } from '../../services/api';
import { Button } from '../../ui/Button';
import { ModuleTag, Pill, PriorityMeter, StatusPill, type Tono } from '../../ui/Badges';
import { Icon } from '../../ui/Icon';
import { Alert, Card, CardHeader, EmptyState, OrbitSpinner } from '../../ui/Surfaces';
import { AgentStepper } from '../../ui/Trace';
import { TopoRadar } from '../../ui/backgrounds/TopoRadar';
import { cls, vars } from '../../ui/cls';
import { formatoDistancia } from '../../ui/format';
import { PlaceCard, type Lugar } from '../../ui/PlaceCard';
import ChatCaso from './ChatCaso';
import Trazabilidad from './Trazabilidad';
import MapaCaso from './MapaCaso';

const ETIQUETAS_ACCION: Record<string, string> = {
  reporte_vial_creado: 'Reporte vial creado',
  solicitud_asistencia_creada: 'Solicitud de asistencia abierta',
  recorrido_guardado: 'Recorrido guardado',
  recomendacion_guardada: 'Recomendación guardada',
};

/** Urgencia o severidad como insignia: siempre con texto, además del color. */
function tonoNivel(nivel?: string): Tono {
  const n = (nivel || '').toLowerCase();
  if (['alta', 'emergencia', 'critica', 'crítica'].includes(n)) return 'danger';
  if (['media', 'moderada'].includes(n)) return 'warn';
  if (['baja', 'leve'].includes(n)) return 'ok';
  return 'neutral';
}

function Hecho({ k, children, ancho }: { k: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={cls(ancho && 'wide')}>
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Lista({ items, no }: { items?: string[]; no?: boolean }) {
  if (!items?.length) return null;
  return <ul className={cls('bullets', no && 'no')}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

function Lugares({ lista }: { lista?: Lugar[] }) {
  if (!lista || lista.length === 0) return null;
  return <div className="places">{lista.map((lugar, i) => <PlaceCard key={i} lugar={lugar} n={i + 1} />)}</div>;
}

export default function CasoView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: caso, isLoading: loadingCaso } = useQuery({
    queryKey: ['caso', id],
    queryFn: () => getCaso(id!),
    refetchInterval: (query) => (query.state.data?.estado === 'procesando' ? 2000 : false),
    enabled: !!id,
  });

  const { data: trazas } = useQuery({
    queryKey: ['trazas', id],
    queryFn: () => getTrazas(id!),
    refetchInterval: caso?.estado === 'procesando' ? 2000 : false,
    enabled: !!id,
  });

  if (loadingCaso) {
    return (
      <div className="page" style={{ placeItems: 'center', minHeight: '60dvh' }}>
        <OrbitSpinner grande etiqueta="Cargando el caso" />
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="page">
        <EmptyState icon="fuera" title="Caso no encontrado" action={<Button onClick={() => navigate('/')}>Volver al inicio</Button>}>
          El enlace no corresponde a ningún caso guardado.
        </EmptyState>
      </div>
    );
  }

  const r = caso.resultado;
  const terminado = caso.estado === 'completado' || caso.estado === 'requiere_info';
  const hasError = caso.estado === 'error';
  const verif = r?.verificacion;
  const dominio = r?.salud || r?.taller || r?.sabor || r?.explora || r?.vial;
  const lugares = r?.salud?.centros || r?.taller?.talleres || r?.sabor?.lugares || r?.explora?.paradas || [];
  const conResultado = terminado && !!r;

  return (
    <div className="page">
      <header className="page-head">
        <div className="row">
          <Button variant="ghost" icon="prev" onClick={() => navigate(-1)}>Volver</Button>
        </div>
        <p className="eyebrow">Análisis del caso</p>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <h1 className="title" style={{ fontSize: 'var(--fs-6)' }}>Resultado</h1>
          <StatusPill estado={caso.estado} />
          {caso.prioridad && caso.prioridad !== 'normal' && <PriorityMeter prioridad={caso.prioridad} prefijo="Prioridad" />}
          {caso.tipo && caso.tipo !== 'indefinido' && <ModuleTag tipo={caso.tipo} />}
        </div>
      </header>

      <div className={cls('caso-grid', conResultado && 'two')}>
        <div className="caso-col">
          <Card className="req">
            <p className="eyebrow">Tu solicitud</p>
            <blockquote>{caso.descripcion}</blockquote>
          </Card>

          {caso.estado === 'procesando' && (
            <Card className="proc" aria-live="polite">
              <div className="bg-local"><TopoRadar /></div>
              <div className="proc-head">
                <OrbitSpinner grande etiqueta="Analizando" />
                <h2>Los agentes están analizando el caso…</h2>
              </div>
              <AgentStepper trazas={trazas} />
              <p className="small muted">El orquestador recorre estas etapas. Al terminar verás la traza completa de lo que hizo cada una.</p>
            </Card>
          )}

          {hasError && (
            <Alert tone="danger" title="Error en el análisis" role="alert">
              {r?.error && <p>{r.error}</p>}
            </Alert>
          )}

          {conResultado && (
            <>
              {/* Verificación: advertencias, información insuficiente o contradictoria */}
              {verif && (
                <Alert tone={verif.aprobado && verif.advertencias.length === 0 ? 'ok' : 'warn'} title={verif.aprobado ? 'Resultado verificado' : 'Necesitamos revisar tu solicitud'}>
                  {verif.advertencias.length > 0 && <ul>{verif.advertencias.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>}
                  <p className="small muted" style={{ marginTop: 'var(--sp-1)' }}>Confianza de la clasificación: {Math.round((r.confianza || 0) * 100)}%</p>
                </Alert>
              )}

              {/* Análisis multimodal: resumen + imagen */}
              <Card className={cls('summary', caso.tiene_imagen && 'has-img')}>
                <div style={{ display: 'grid', gap: 'var(--sp-1)', alignContent: 'start' }}>
                  <p><strong>Resumen:</strong> {r.resumen}</p>
                  {r.ubicacion && (
                    <p className="small muted" style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                      <Icon name="geo" /> <span>{r.ubicacion.texto} <em>({r.ubicacion.fuente})</em></span>
                    </p>
                  )}
                  {r.observacion_imagen && (
                    <p className="small" style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-start' }}>
                      <Icon name="imagen" /> <span><strong>En la imagen:</strong> {r.observacion_imagen}</span>
                    </p>
                  )}
                </div>
                {caso.tiene_imagen && (
                  <div className="photo"><img src={imagenCasoUrl(caso.id)} alt="Imagen enviada por el usuario" /></div>
                )}
              </Card>

              {/* Acciones ejecutadas en el sistema */}
              {r.acciones?.length > 0 && (
                <Card feature>
                  <CardHeader icon="accion" title="Acciones realizadas" />
                  <ul className="actions-list">
                    {r.acciones.map((a: any, i: number) => (
                      <li key={i}>
                        <Icon name="check" />
                        <span>{ETIQUETAS_ACCION[a.tipo] || a.tipo}{a.lugar ? `: ${a.lugar}` : ''}</span>
                        <code>#{String(a.id).slice(0, 8)}</code>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {dominio && (
                <Card>
                  {/* SALUD */}
                  {r.salud && (
                    <div className="dom" style={vars({ '--accent': 'var(--m-salud)' })}>
                      <h2 className="dom-title"><Icon name="salud" /> Orientación en salud</h2>
                      <dl className="facts">
                        <Hecho k="Especialidad">{r.salud.especialidad_sugerida}</Hecho>
                        <Hecho k="Urgencia"><Pill tone={tonoNivel(r.salud.nivel_urgencia)}>{r.salud.nivel_urgencia}</Pill></Hecho>
                        {r.salud.senales_alarma?.length > 0 && <Hecho k="Señales de alarma" ancho>{r.salud.senales_alarma.join(', ')}</Hecho>}
                      </dl>
                      {r.salud.recomendaciones_estabilizacion?.length > 0 && (
                        <div><h3 className="block-title">Qué hacer ahora</h3><Lista items={r.salud.recomendaciones_estabilizacion} /></div>
                      )}
                      {r.salud.que_no_hacer?.length > 0 && (
                        <div><h3 className="block-title">Qué NO hacer</h3><Lista items={r.salud.que_no_hacer} no /></div>
                      )}
                      <p className="small muted">{r.salud.aviso}</p>
                      <Lugares lista={r.salud.centros} />
                    </div>
                  )}

                  {/* TALLER */}
                  {r.taller && (
                    <div className="dom" style={vars({ '--accent': 'var(--m-taller)' })}>
                      <h2 className="dom-title"><Icon name="taller" /> Asistencia mecánica</h2>
                      {r.taller.puede_conducir === false && (
                        <div className="alarm" role="alert"><Icon name="alerta" /> <span><strong>ALERTA:</strong> NO CONDUZCA EL VEHÍCULO.</span></div>
                      )}
                      <dl className="facts">
                        <Hecho k="Vehículo">{r.taller.tipo_vehiculo}</Hecho>
                        <Hecho k="Falla probable">{r.taller.falla_probable}</Hecho>
                        <Hecho k="Urgencia"><Pill tone={tonoNivel(r.taller.urgencia)}>{r.taller.urgencia}</Pill></Hecho>
                        {r.taller.testigos_detectados?.length > 0 && <Hecho k="Testigos" ancho>{r.taller.testigos_detectados.join(', ')}</Hecho>}
                      </dl>
                      {r.taller.pasos_seguridad?.length > 0 && (
                        <div><h3 className="block-title">Pasos de seguridad</h3><Lista items={r.taller.pasos_seguridad} /></div>
                      )}
                      <Lugares lista={r.taller.talleres} />
                    </div>
                  )}

                  {/* SABOR */}
                  {r.sabor && (
                    <div className="dom" style={vars({ '--accent': 'var(--m-comida)' })}>
                      <h2 className="dom-title"><Icon name="sabor" /> Recomendaciones gastronómicas</h2>
                      <dl className="facts">
                        <Hecho k="Antojo">{r.sabor.antojo}</Hecho>
                        <Hecho k="Cocina">{r.sabor.tipo_cocina}</Hecho>
                        {r.sabor.presupuesto_max ? <Hecho k="Presupuesto">${r.sabor.presupuesto_max.toLocaleString('es-CO')}</Hecho> : null}
                      </dl>
                      <Lugares lista={r.sabor.lugares} />
                    </div>
                  )}

                  {/* EXPLORA */}
                  {r.explora && (
                    <div className="dom" style={vars({ '--accent': 'var(--m-explora)' })}>
                      <h2 className="dom-title"><Icon name="explora" /> Recorrido sugerido: {r.explora.lugar_identificado}</h2>
                      <dl className="facts">
                        <Hecho k="Contexto" ancho>{r.explora.contexto}</Hecho>
                        <Hecho k="Total" ancho>
                          {formatoDistancia(r.explora.distancia_total_m)}
                          {r.explora.paradas.some((p: any) => p.modo === 'drive') ? ' (incluye tramos en carro)' : ' a pie'} · {Math.round(r.explora.duracion_total_s / 60)} min con visitas
                        </Hecho>
                      </dl>
                      <Lugares lista={r.explora.paradas} />
                    </div>
                  )}

                  {/* VIAL */}
                  {r.vial && (
                    <div className="dom" style={vars({ '--accent': 'var(--m-vial)' })}>
                      <h2 className="dom-title"><Icon name="vial" /> Reporte vial</h2>
                      <dl className="facts">
                        <Hecho k="Problema">{r.vial.tipo_problema}</Hecho>
                        <Hecho k="Severidad"><Pill tone={tonoNivel(r.vial.severidad)}>{r.vial.severidad}</Pill></Hecho>
                        <Hecho k="Riesgo" ancho>{r.vial.riesgo}</Hecho>
                        <Hecho k="Entidad sugerida">{r.vial.entidad_sugerida}</Hecho>
                        <Hecho k="Reportes abiertos cerca (150 m)">{r.vial.duplicados_cercanos}</Hecho>
                      </dl>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>

        {conResultado && (
          <div className="caso-col">
            {r.ubicacion && <MapaCaso origen={r.ubicacion} lugares={lugares} conectar={!!r.explora} />}
            <ChatCaso casoId={caso.id} />
            <Trazabilidad trazas={trazas || []} />
          </div>
        )}
      </div>

      {!conResultado && <Trazabilidad trazas={trazas || []} />}
    </div>
  );
}
