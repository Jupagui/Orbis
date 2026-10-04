import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCaso, getTrazas } from '../../services/api';
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Navigation, Globe, MapPin, Activity, ShieldAlert, Wrench, Utensils, Map as MapIcon } from 'lucide-react';

export default function CasoView() {
  const { id } = useParams<{ id: string }>();

  const { data: caso, isLoading: loadingCaso } = useQuery({
    queryKey: ['caso', id],
    queryFn: () => getCaso(id!),
    refetchInterval: (query) => {
      const isFinished = query.state.data?.estado === 'completado' || query.state.data?.estado === 'error';
      return isFinished ? false : 2000;
    },
    enabled: !!id,
  });

  const { data: trazas } = useQuery({
    queryKey: ['trazas', id],
    queryFn: () => getTrazas(id!),
    refetchInterval: (query) => {
      return caso?.estado === 'completado' || caso?.estado === 'error' ? false : 2000;
    },
    enabled: !!id,
  });

  if (loadingCaso) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={64} color="var(--primary)" /></div>;
  }

  if (!caso) {
    return <div style={{ padding: '2rem' }}>Caso no encontrado</div>;
  }

  const isComplete = caso.estado === 'completado';
  const hasError = caso.estado === 'error';

  const renderLugares = (lugares: any[]) => {
    if (!lugares || lugares.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {lugares.map((lugar: any, i: number) => (
          <div 
            key={i} 
            style={{ 
              backgroundColor: 'var(--surface-2)', 
              padding: '1.5rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border)',
              animation: `slide-up ${0.3 + (i * 0.1)}s ease-out`,
              transition: 'transform 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>{lugar.nombre || lugar.nombre_centro || lugar.nombre_parada || "Lugar Sugerido"}</h4>
            
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>
              {lugar.motivo || lugar.motivo_eleccion || lugar.especialidad_sugerida || lugar.direccion || lugar.descripcion || ""}
            </p>
            
            {(lugar.distancia_m || lugar.duracion_s) && (
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                 {lugar.distancia_m && <span>Aprox: {Math.round(lugar.distancia_m)}m </span>}
                 {lugar.duracion_s && <span>({Math.round(lugar.duracion_s / 60)} min)</span>}
               </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${lugar.lat || ''},${lugar.lon || ''}+${encodeURIComponent(lugar.nombre || lugar.nombre_centro || "")}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)', textDecoration: 'none', padding: '0.6rem 1rem', backgroundColor: 'var(--surface-1)', borderRadius: '20px', fontSize: '0.9rem', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
              >
                <Navigation size={16} color="var(--accent-via)" /> Ver en Mapa
              </a>
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(lugar.nombre || lugar.nombre_centro || "")}`} 
                target="_blank" 
                rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text)', textDecoration: 'none', padding: '0.6rem 1rem', backgroundColor: 'var(--surface-1)', borderRadius: '20px', fontSize: '0.9rem', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
              >
                <Globe size={16} color="var(--primary)" /> Info / Web
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      <header style={{ padding: '0.5rem 2%', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={16} /> Volver
          </button>
          <h1 style={{ margin: 0, color: 'var(--primary)', animation: 'fade-in 0.5s ease-out', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Análisis del Caso
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
            {caso.estado}
          </span>
          {caso.tipo && (
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', backgroundColor: `var(--accent-${caso.tipo === 'comida' ? 'sabor' : caso.tipo})`, color: '#fff', textTransform: 'uppercase' }}>
              {caso.tipo}
            </span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '1rem 2%', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        
        {caso.estado === 'procesando' && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--surface-1)', borderRadius: 'var(--radius-md)', animation: 'pulse 2s infinite' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Analizando caso...</h2>
          </div>
        )}

        {hasError && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#3d1c1c', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', animation: 'shake 0.5s' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 1rem auto', color: 'var(--danger)' }} />
            <h2 style={{ color: 'var(--danger)', fontSize: '1.2rem', margin: 0 }}>Error en el análisis</h2>
          </div>
        )}

        {isComplete && caso.resultado && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            
            <div style={{ animation: 'fade-in 0.5s ease-out' }}>
              <div style={{ backgroundColor: 'var(--surface-1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                
                {/* SALUD */}
                {caso.resultado.salud && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-salud)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Activity size={18} /> Diagnóstico Médico Inicial
                    </h2>
                    <div style={{ backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <p style={{ margin: 0 }}><strong>Especialidad:</strong> {caso.resultado.salud.especialidad_sugerida} | <strong>Urgencia:</strong> <span style={{ color: caso.resultado.salud.nivel_urgencia === 'emergencia' ? 'var(--danger)' : 'inherit' }}>{caso.resultado.salud.nivel_urgencia.toUpperCase()}</span></p>
                    </div>
                    {caso.resultado.salud.recomendaciones_estabilizacion?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--text)', fontSize: '1rem', margin: '0 0 0.5rem 0' }}>Acciones Inmediatas:</h3>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {caso.resultado.salud.recomendaciones_estabilizacion.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {renderLugares(caso.resultado.salud.centros)}
                  </div>
                )}

                {/* TALLER */}
                {caso.resultado.taller && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-taller)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Wrench size={18} /> Asistencia Mecánica
                    </h2>
                    {caso.resultado.taller.puede_conducir === false && (
                      <div style={{ padding: '0.8rem', backgroundColor: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <ShieldAlert size={18} /> <strong>ALERTA:</strong> NO CONDUZCA EL VEHÍCULO.
                      </div>
                    )}
                    <div style={{ backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <p style={{ margin: 0 }}><strong>Falla:</strong> {caso.resultado.taller.falla_probable} | <strong>Urgencia:</strong> {caso.resultado.taller.urgencia.toUpperCase()}</p>
                    </div>
                    {renderLugares(caso.resultado.taller.talleres)}
                  </div>
                )}

                {/* SABOR */}
                {caso.resultado.sabor && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-sabor)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <Utensils size={18} /> Recomendaciones Gastronómicas
                    </h2>
                    <div style={{ backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <p style={{ margin: 0 }}><strong>Resumen AI:</strong> {caso.resultado.resumen}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}><strong>Antojo:</strong> {caso.resultado.sabor.antojo} | <strong>Tipo de Cocina:</strong> {caso.resultado.sabor.tipo_cocina}</p>
                    </div>
                    {renderLugares(caso.resultado.sabor.lugares)}
                  </div>
                )}
                
                {/* EXPLORA */}
                {caso.resultado.explora && (
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-explora)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                      <MapIcon size={18} /> Recorrido Sugerido
                    </h2>
                    <div style={{ backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <p style={{ margin: 0 }}>{caso.resultado.explora.resumen_recorrido} ({caso.resultado.explora.duracion_total_minutos} min)</p>
                    </div>
                    {renderLugares(caso.resultado.explora.paradas)}
                  </div>
                )}

                {/* VIAL / OTRO */}
                {!caso.resultado.salud && !caso.resultado.taller && !caso.resultado.sabor && !caso.resultado.explora && (
                   <div>
                     <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-via)', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                       <AlertTriangle size={18} /> Análisis del Reporte
                     </h2>
                     <div style={{ backgroundColor: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                       <p style={{ margin: 0 }}>{caso.resultado.resumen}</p>
                       <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>{caso.resultado.recomendacion_principal || caso.resultado.descripcion}</p>
                     </div>
                     {caso.resultado.lugares_sugeridos && renderLugares(caso.resultado.lugares_sugeridos)}
                   </div>
                )}
              </div>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}
