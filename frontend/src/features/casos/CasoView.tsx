import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCaso, getTrazas, imagenCasoUrl, PRIORIDADES } from '../../services/api';
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Navigation, Activity, ShieldAlert, Wrench, Utensils, Map as MapIcon, MapPin, Image as ImageIcon, Zap, Info } from 'lucide-react';
import ChatCaso from './ChatCaso';
import Trazabilidad from './Trazabilidad';
import MapaCaso from './MapaCaso';

const ETIQUETAS_ACCION: Record<string, string> = {
  reporte_vial_creado: 'Reporte vial creado',
  solicitud_asistencia_creada: 'Solicitud de asistencia abierta',
  recorrido_guardado: 'Recorrido guardado',
  recomendacion_guardada: 'Recomendación guardada',
};

const card = { backgroundColor: 'var(--surface-1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' };
const caja = { backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' };

function formatoDistancia(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
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
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={64} color="var(--primary)" /></div>;
  }

  if (!caso) {
    return <div style={{ padding: '2rem' }}>Caso no encontrado</div>;
  }

  const r = caso.resultado;
  const terminado = caso.estado === 'completado' || caso.estado === 'requiere_info';
  const hasError = caso.estado === 'error';
  const verif = r?.verificacion;
  const dominio = r?.salud || r?.taller || r?.sabor || r?.explora || r?.vial;
  const lugares = r?.salud?.centros || r?.taller?.talleres || r?.sabor?.lugares || r?.explora?.paradas || [];

  const renderLugares = (lista: any[]) => {
    if (!lista || lista.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {lista.map((lugar: any, i: number) => (
          <div key={i} style={{ backgroundColor: 'var(--surface-2)', padding: '1.2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>{i + 1}. {lugar.nombre}</h4>
            {(lugar.motivo || lugar.descripcion) && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{lugar.motivo || lugar.descripcion}</p>
            )}
            {lugar.telefono && <p style={{ margin: 0, fontSize: '0.85rem' }}>Tel: {lugar.telefono}</p>}
            {lugar.precio_promedio && (
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Precio promedio: ${lugar.precio_promedio.toLocaleString('es-CO')} {lugar.precio_verificado ? '(verificado)' : '(sin verificar)'}
              </p>
            )}
            {lugar.minutos_sugeridos ? <p style={{ margin: 0, fontSize: '0.85rem' }}>Visita sugerida: {lugar.minutos_sugeridos} min</p> : null}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {lugar.ruta_verificada
                ? <>{formatoDistancia(lugar.distancia_m)} · {Math.round(lugar.duracion_s / 60)} min{lugar.modo === 'drive' ? ' en carro' : lugar.modo === 'walk' ? ' a pie' : ''} <span style={{ color: 'var(--success)' }}>(ruta real)</span></>
                : <span>Distancia no confirmada</span>}
              {lugar.fuente && <> · fuente: {lugar.fuente}</>}
            </div>
            {lugar.lat && lugar.lon && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lon}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)', textDecoration: 'none', padding: '0.5rem 0.9rem', backgroundColor: 'var(--surface-1)', borderRadius: '20px', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                <Navigation size={14} color="var(--accent-via)" /> Cómo llegar
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '0.5rem 2%', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>Análisis del Caso</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {caso.prioridad && caso.prioridad !== 'normal' && (
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', border: `1px solid ${(PRIORIDADES[caso.prioridad] || PRIORIDADES.normal).color}`, color: (PRIORIDADES[caso.prioridad] || PRIORIDADES.normal).color, textTransform: 'uppercase' }}>
              Prioridad {(PRIORIDADES[caso.prioridad] || PRIORIDADES.normal).texto}
            </span>
          )}
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
            {caso.estado.replace('_', ' ')}
          </span>
          {caso.tipo && caso.tipo !== 'indefinido' && (
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: `var(--accent-${caso.tipo === 'comida' ? 'sabor' : caso.tipo})`, color: '#fff', textTransform: 'uppercase' }}>
              {caso.tipo}
            </span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '1rem 2%', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>

        <section style={card}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu solicitud</p>
          <p style={{ margin: '0.3rem 0 0 0' }}>{caso.descripcion}</p>
        </section>

        {caso.estado === 'procesando' && (
          <div style={{ ...card, padding: '2rem', textAlign: 'center', animation: 'pulse 2s infinite' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Los agentes están analizando el caso…</h2>
          </div>
        )}

        {hasError && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#3d1c1c', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--danger)' }} />
            <h2 style={{ color: 'var(--danger)', fontSize: '1.2rem', margin: 0 }}>Error en el análisis</h2>
            {r?.error && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.error}</p>}
          </div>
        )}

        {terminado && r && (
          <>
            {/* Verificación: advertencias, información insuficiente o contradictoria */}
            {verif && (
              <section style={{ ...card, borderColor: verif.aprobado && verif.advertencias.length === 0 ? 'var(--success)' : 'var(--warning)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', fontSize: '1rem', color: verif.aprobado ? 'var(--success)' : 'var(--warning)' }}>
                  {verif.aprobado ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  {verif.aprobado ? 'Resultado verificado' : 'Necesitamos revisar tu solicitud'}
                </h2>
                {verif.advertencias.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {verif.advertencias.map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                )}
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Info size={12} /> Confianza de la clasificación: {Math.round((r.confianza || 0) * 100)}%
                </p>
              </section>
            )}

            {/* Análisis multimodal: resumen + imagen */}
            <section style={{ ...card, display: 'grid', gridTemplateColumns: caso.tiene_imagen ? 'minmax(0, 1fr) minmax(0, 220px)' : '1fr', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0 }}><strong>Resumen:</strong> {r.resumen}</p>
                {r.ubicacion && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <MapPin size={12} /> {r.ubicacion.texto} <em>({r.ubicacion.fuente})</em>
                  </p>
                )}
                {r.observacion_imagen && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                    <ImageIcon size={12} /> <strong>En la imagen:</strong> {r.observacion_imagen}
                  </p>
                )}
              </div>
              {caso.tiene_imagen && (
                <img src={imagenCasoUrl(caso.id)} alt="Imagen enviada por el usuario" style={{ width: '100%', borderRadius: 'var(--radius-sm)', objectFit: 'cover', maxHeight: '180px' }} />
              )}
            </section>

            {/* Acciones ejecutadas en el sistema */}
            {r.acciones?.length > 0 && (
              <section style={{ ...card, borderColor: 'var(--secondary)' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--secondary)' }}>
                  <Zap size={18} /> Acciones realizadas
                </h2>
                {r.acciones.map((a: any, i: number) => (
                  <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>
                    ✔ {ETIQUETAS_ACCION[a.tipo] || a.tipo}{a.lugar ? `: ${a.lugar}` : ''} <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>#{String(a.id).slice(0, 8)}</span>
                  </p>
                ))}
              </section>
            )}

            {dominio && (
              <section style={card}>
                {/* SALUD */}
                {r.salud && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-salud)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Activity size={18} /> Orientación en salud
                    </h2>
                    <div style={caja}>
                      <p style={{ margin: 0 }}><strong>Especialidad:</strong> {r.salud.especialidad_sugerida} | <strong>Urgencia:</strong> <span style={{ color: ['alta', 'emergencia'].includes(r.salud.nivel_urgencia) ? 'var(--danger)' : 'inherit' }}>{r.salud.nivel_urgencia.toUpperCase()}</span></p>
                      {r.salud.senales_alarma?.length > 0 && <p style={{ margin: '0.5rem 0 0 0' }}><strong>Señales de alarma:</strong> {r.salud.senales_alarma.join(', ')}</p>}
                    </div>
                    {r.salud.recomendaciones_estabilizacion?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Qué hacer ahora:</h3>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {r.salud.recomendaciones_estabilizacion.map((x: string, i: number) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                    {r.salud.que_no_hacer?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Qué NO hacer:</h3>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {r.salud.que_no_hacer.map((x: string, i: number) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.salud.aviso}</p>
                    {renderLugares(r.salud.centros)}
                  </div>
                )}

                {/* TALLER */}
                {r.taller && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-taller)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Wrench size={18} /> Asistencia mecánica
                    </h2>
                    {r.taller.puede_conducir === false && (
                      <div style={{ padding: '0.8rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <ShieldAlert size={18} /> <strong>ALERTA:</strong> NO CONDUZCA EL VEHÍCULO.
                      </div>
                    )}
                    <div style={caja}>
                      <p style={{ margin: 0 }}><strong>Vehículo:</strong> {r.taller.tipo_vehiculo} | <strong>Falla probable:</strong> {r.taller.falla_probable} | <strong>Urgencia:</strong> {r.taller.urgencia.toUpperCase()}</p>
                      {r.taller.testigos_detectados?.length > 0 && <p style={{ margin: '0.5rem 0 0 0' }}><strong>Testigos:</strong> {r.taller.testigos_detectados.join(', ')}</p>}
                    </div>
                    {r.taller.pasos_seguridad?.length > 0 && (
                      <ul style={{ paddingLeft: '1.2rem', margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {r.taller.pasos_seguridad.map((x: string, i: number) => <li key={i}>{x}</li>)}
                      </ul>
                    )}
                    {renderLugares(r.taller.talleres)}
                  </div>
                )}

                {/* SABOR */}
                {r.sabor && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-sabor)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Utensils size={18} /> Recomendaciones gastronómicas
                    </h2>
                    <div style={caja}>
                      <p style={{ margin: 0 }}><strong>Antojo:</strong> {r.sabor.antojo} | <strong>Cocina:</strong> {r.sabor.tipo_cocina}{r.sabor.presupuesto_max ? ` | Presupuesto: $${r.sabor.presupuesto_max.toLocaleString('es-CO')}` : ''}</p>
                    </div>
                    {renderLugares(r.sabor.lugares)}
                  </div>
                )}

                {/* EXPLORA */}
                {r.explora && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-explora)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <MapIcon size={18} /> Recorrido sugerido: {r.explora.lugar_identificado}
                    </h2>
                    <div style={caja}>
                      <p style={{ margin: 0 }}>{r.explora.contexto}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}>
                        <strong>Total:</strong> {formatoDistancia(r.explora.distancia_total_m)}
                        {r.explora.paradas.some((p: any) => p.modo === 'drive') ? ' (incluye tramos en carro)' : ' a pie'} · {Math.round(r.explora.duracion_total_s / 60)} min con visitas
                      </p>
                    </div>
                    {renderLugares(r.explora.paradas)}
                  </div>
                )}

                {/* VIAL */}
                {r.vial && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-via)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <AlertTriangle size={18} /> Reporte vial
                    </h2>
                    <div style={caja}>
                      <p style={{ margin: 0 }}><strong>Problema:</strong> {r.vial.tipo_problema} | <strong>Severidad:</strong> {r.vial.severidad.toUpperCase()}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}><strong>Riesgo:</strong> {r.vial.riesgo}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}><strong>Entidad sugerida:</strong> {r.vial.entidad_sugerida}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}><strong>Reportes abiertos cerca (150 m):</strong> {r.vial.duplicados_cercanos}</p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {r.ubicacion && <MapaCaso origen={r.ubicacion} lugares={lugares} conectar={!!r.explora} />}

            <ChatCaso casoId={caso.id} />
          </>
        )}

        <Trazabilidad trazas={trazas || []} />
      </main>
    </div>
  );
}
