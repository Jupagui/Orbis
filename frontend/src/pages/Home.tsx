import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportarCaso } from '../services/api';
import { Camera, MapPin, Activity, Utensils, Wrench, Map, X, Search, ChevronRight } from 'lucide-react';

type Topic = 'vial' | 'salud' | 'comida' | 'taller' | 'explora' | null;

export default function Home() {
  const [desc, setDesc] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc) return;
    setLoading(true);

    try {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const res = await reportarCaso(desc, selectedTopic || undefined, position.coords.latitude, position.coords.longitude);
              navigate(`/casos/${res.id}`);
            } catch (error) {
              console.error(error);
              alert('Error enviando reporte');
              setLoading(false);
            }
          },
          async (err) => {
            console.warn("Location error:", err);
            // Fallback si niega permiso: centro de Bogotá
            try {
              const res = await reportarCaso(desc, selectedTopic || undefined, 4.6097, -74.0817);
              navigate(`/casos/${res.id}`);
            } catch (error) {
              alert('Error enviando reporte');
              setLoading(false);
            }
          }
        );
      } else {
        // Fallback si no soporta
        const res = await reportarCaso(desc, selectedTopic || undefined, 4.6097, -74.0817);
        navigate(`/casos/${res.id}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error enviando reporte');
      setLoading(false);
    }
  };

  const topicConfig = {
    vial: { 
      title: 'Reporte Vial', 
      desc: 'Huecos, semáforos, accidentes',
      placeholder: 'Ej: Hay un hueco gigante en la Av. 68 con Calle 26...',
      image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400&h=200'
    },
    salud: { 
      title: 'Salud', 
      desc: 'Síntomas y emergencias médicas',
      placeholder: 'Ej: Mi abuelo tiene un fuerte dolor en el pecho izquierdo...',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400&h=200'
    },
    comida: { 
      title: 'Sabor', 
      desc: 'Recomendaciones gastronómicas',
      placeholder: 'Ej: Antojo de comida asiática, presupuesto medio...',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400&h=200'
    },
    taller: { 
      title: 'Taller', 
      desc: 'Asistencia mecánica',
      placeholder: 'Ej: Mi carro empezó a echar humo azul...',
      image: 'https://images.unsplash.com/photo-1503376710356-69f84bc0f443?auto=format&fit=crop&q=80&w=400&h=200'
    },
    explora: { 
      title: 'Explora', 
      desc: 'Turismo y recorridos',
      placeholder: 'Ej: Tengo 3 horas libres en el centro...',
      image: 'https://images.unsplash.com/photo-1542360663-8f40838b8d7a?auto=format&fit=crop&q=80&w=400&h=200'
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Hero Header */}
      <header style={{ 
        position: 'relative',
        padding: '6rem 2rem 4rem', 
        textAlign: 'center', 
        backgroundColor: 'var(--surface-1)',
        backgroundImage: 'linear-gradient(to bottom, rgba(20,20,20,0.8), var(--bg)), url(https://images.unsplash.com/photo-1583345214046-24e0da115599?auto=format&fit=crop&q=80&w=2000)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '2rem', zIndex: 10 }}>
          <button 
            onClick={() => navigate('/heatmap')}
            style={{ padding: '0.8rem 1.5rem', borderRadius: '30px', backgroundColor: 'var(--accent-via)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
          >
            <MapPin size={18} /> Tablero de Calor
          </button>
        </div>
        <div style={{ position: 'relative', zIndex: 1, animation: 'fade-in 1s ease-out' }}>
          <h1 style={{ color: 'var(--primary)', fontSize: '3.5rem', marginBottom: '1rem', letterSpacing: '2px' }}>ORBIS</h1>
          <p style={{ color: 'var(--text)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            La ciudad, entendida. Reporta, oriéntate y descubre con Inteligencia Artificial.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {!selectedTopic ? (
          <div style={{ animation: 'slide-up 0.5s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2>¿En qué te puedo ayudar hoy?</h2>
              <p style={{ color: 'var(--text-muted)' }}>Selecciona una categoría o haz una búsqueda general</p>
            </div>

            {/* Búsqueda general */}
            <div style={{ maxWidth: '800px', margin: '0 auto 4rem auto', position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '1.2rem', color: 'var(--primary)' }} />
              <input 
                type="text"
                placeholder="Busca o reporta lo que sea (Ej: Tráfico en calle 100, dolor de cabeza...)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                style={{
                  width: '100%',
                  padding: '1.2rem 1rem 1.2rem 3.5rem',
                  fontSize: '1.1rem',
                  borderRadius: '30px',
                  border: '2px solid var(--border)',
                  backgroundColor: 'var(--surface-1)',
                  color: 'var(--text)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.3s'
                }}
              />
              {desc && (
                <button 
                  onClick={handleSubmit}
                  style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', bottom: '0.5rem', padding: '0 1.5rem', borderRadius: '25px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Analizar
                </button>
              )}
            </div>

            {/* Tarjetas de Módulo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <ModuleCard topic="vial" icon={<MapPin size={32} color="var(--accent-via)" />} config={topicConfig.vial} onClick={() => setSelectedTopic('vial')} />
              <ModuleCard topic="salud" icon={<Activity size={32} color="var(--accent-salud)" />} config={topicConfig.salud} onClick={() => setSelectedTopic('salud')} />
              <ModuleCard topic="comida" icon={<Utensils size={32} color="var(--accent-sabor)" />} config={topicConfig.comida} onClick={() => setSelectedTopic('comida')} />
              <ModuleCard topic="taller" icon={<Wrench size={32} color="var(--accent-taller)" />} config={topicConfig.taller} onClick={() => setSelectedTopic('taller')} />
              <ModuleCard topic="explora" icon={<Map size={32} color="var(--accent-explora)" />} config={topicConfig.explora} onClick={() => setSelectedTopic('explora')} />
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'scale-up 0.4s ease-out' }}>
            <div style={{ backgroundColor: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              
              <div style={{ height: '200px', backgroundImage: `url(${topicConfig[selectedTopic].image})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                <button 
                  onClick={() => setSelectedTopic(null)} 
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }}
                >
                  <X size={20} />
                </button>
                <div style={{ position: 'absolute', bottom: '1.5rem', left: '2rem', color: '#fff', zIndex: 10 }}>
                  <h2 style={{ margin: 0, fontSize: '2rem' }}>{topicConfig[selectedTopic].title}</h2>
                  <p style={{ margin: 0, opacity: 0.8 }}>{topicConfig[selectedTopic].desc}</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Describe los detalles:</label>
                  <textarea 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder={topicConfig[selectedTopic].placeholder}
                    style={{ 
                      width: '100%', 
                      minHeight: '150px', 
                      padding: '1rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '1.1rem',
                      resize: 'vertical'
                    }}
                    autoFocus
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading || !desc}
                  style={{ 
                    padding: '1.2rem', 
                    backgroundColor: 'var(--primary)', 
                    color: 'var(--on-primary)', 
                    border: 'none', 
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    cursor: (loading || !desc) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'opacity 0.2s, transform 0.2s'
                  }}
                  onMouseOver={(e) => !loading && desc && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {loading ? 'Procesando con IA...' : <>Analizar <ChevronRight size={20} /></>}
                </button>
              </form>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ModuleCard({ topic, icon, config, onClick }: { topic: string, icon: React.ReactNode, config: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        backgroundColor: 'var(--surface-1)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-10px)';
        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.4)';
        e.currentTarget.style.borderColor = `var(--accent-${topic === 'comida' ? 'sabor' : topic})`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ height: '120px', backgroundImage: `url(${config.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface-2)', borderRadius: '50%', marginTop: '-3rem', border: '4px solid var(--surface-1)' }}>
          {icon}
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>{config.title}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>{config.desc}</p>
      </div>
    </div>
  );
}
