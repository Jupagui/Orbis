import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportarCaso } from '../services/api';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Badges';
import { Icon } from '../ui/Icon';
import { Field, ImageDrop, TextArea } from '../ui/Inputs';
import { ModuleArt } from '../ui/ModuleArt';
import { ModuleCard } from '../ui/ModuleCard';
import { Sheet } from '../ui/Overlays';
import { useAnimatedSvg } from '../ui/backgrounds/useAnimatedSvg';
import { cls, vars } from '../ui/cls';
import { LISTA_MODULOS, MODULOS, type ModuloKey } from '../ui/modules';
import { useToast } from '../ui/useToast';

type Topic = ModuloKey | null;

const EJEMPLOS = [
  'Hay un hueco enorme en la Av. 68',
  'Me duele el pecho y el brazo izquierdo',
  'Antojo de hamburguesa, máximo 40 mil',
  'Mi carro echa humo',
  'Tengo 3 horas en La Candelaria',
];

// Pide el GPS al navegador. Si el usuario lo niega o tarda mucho, devuelve null
// (el backend lo marca como "ubicación no confirmada" en vez de inventar una).
function obtenerUbicacion(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}

/** La «O» de ORBIS con una órbita y un satélite que la recorre. */
function MarcaO() {
  const ref = useRef<SVGSVGElement>(null);
  useAnimatedSvg(ref);
  return (
    <span className="o-wrap" aria-hidden="true">
      O
      <svg ref={ref} className="o-orbit" viewBox="0 0 100 60" focusable="false">
        <g className="tilt">
          <ellipse id="hero-orbit" cx="50" cy="30" rx="48" ry="12" />
          <circle r="2.6"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#hero-orbit" /></animateMotion></circle>
        </g>
      </svg>
    </span>
  );
}

export default function Home() {
  const [desc, setDesc] = useState('');
  const [direccion, setDireccion] = useState('');
  const [imagen, setImagen] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const avisar = useToast();

  const elegirImagen = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setImagen(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const enviar = async () => {
    if (!desc || loading) return;
    setLoading(true);

    try {
      // Si escribió una dirección no hace falta pedir el GPS
      const gps = direccion ? null : await obtenerUbicacion();
      const res = await reportarCaso({
        descripcion: desc,
        tipo: selectedTopic || undefined,
        lat: gps?.lat,
        lon: gps?.lon,
        direccion: direccion || undefined,
        imagen,
      });
      navigate(`/casos/${res.id}`);
    } catch (error: any) {
      console.error(error);
      avisar(error?.response?.data?.detail || 'Error enviando reporte', 'error');
      setLoading(false);
    }
  };

  const alEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    void enviar();
  };

  const tema = selectedTopic ? MODULOS[selectedTopic] : null;

  return (
    <div className="page home">
      <div className="home-grid">
      <header className="hero">
        <p className="eyebrow rise" style={vars({ '--i': 0 })}>Asistente urbano · Bogotá</p>
        <h1 className="hero-title rise" style={vars({ '--i': 1 })} aria-label="ORBIS"><MarcaO /><span aria-hidden="true">RBIS</span></h1>
        <p className="hero-sub rise" style={vars({ '--i': 2 })}>La ciudad, <em>entendida.</em></p>
        <p className="lead rise" style={vars({ '--i': 3 })}>Reporta, oriéntate y descubre con inteligencia artificial. Cuéntanos qué pasa, adjunta una foto y ORBIS consulta datos y mapas reales.</p>

        <form className="cmd rise" style={vars({ '--i': 4 })} onSubmit={alEnviar}>
          <div className="cmd-bar">
            <Icon name="buscar" />
            <input
              type="text"
              aria-label="Describe lo que necesitas"
              placeholder="Busca o reporta lo que sea: tráfico en la calle 100…"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            {/* Cámara: adjuntar una foto sin elegir antes una categoría */}
            <label className={cls('cmd-cam', imagen && 'has')} title="Adjuntar una foto">
              <Icon name="camara" />
              <input type="file" accept="image/*" aria-label="Adjuntar una foto" onChange={(e) => elegirImagen(e.target.files?.[0] || null)} />
            </label>
            {desc && <Button type="submit" loading={loading} icon="next">Analizar</Button>}
          </div>

          {/* Vista previa de la foto adjunta */}
          {preview && (
            <div className="photo-row">
              <img src={preview} alt="Foto adjunta" />
              <div className="meta">
                <b>{imagen?.name}</b>
                <span>{desc ? 'Se enviará junto con tu descripción.' : 'Escribe qué necesitas para poder analizar la foto.'}</span>
              </div>
              <Button variant="ghost" icon="cerrar" onClick={() => elegirImagen(null)}>Quitar</Button>
            </div>
          )}

          <div className="cmd-examples" role="group" aria-label="Ejemplos">
            <span>Prueba con</span>
            {EJEMPLOS.map((ej) => <Chip key={ej} onClick={() => setDesc(ej)}>{ej}</Chip>)}
          </div>
        </form>
      </header>

      <section className="mods" aria-labelledby="mods">
        <div className="section-head" style={{ marginBottom: 'var(--sp-3)' }}>
          <div>
            <p className="eyebrow">Cinco módulos</p>
            <h2 id="mods">¿En qué te puedo ayudar hoy?</h2>
          </div>
          <p className="muted small hide-wide">Selecciona una categoría o usa la búsqueda general.</p>
        </div>
        <div className="module-grid">
          {LISTA_MODULOS.map((m, i) => <ModuleCard key={m.key} modulo={m} indice={i + 5} onClick={() => setSelectedTopic(m.key)} />)}
        </div>
      </section>
      </div>

      <Sheet abierto={!!tema} onCerrar={() => setSelectedTopic(null)} titulo={tema?.titulo ?? ''} descripcion={tema?.desc}>
        {tema && (
          <form className="form-grid" onSubmit={alEnviar}>
            <div className="sheet-art" style={vars({ '--accent': `var(${tema.accent})` })}><ModuleArt modulo={tema.key} /></div>
            <TextArea
              label="Describe los detalles"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={tema.placeholder}
            />
            <div className="form-grid two">
              <ImageDrop label="Foto (opcional)" archivo={imagen} vista={preview} onChange={elegirImagen} />
              <Field
                label="Dirección o punto de origen (opcional)"
                icon="geo"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Carrera 7 # 40-62"
                hint={<><Icon name="gps" />Si la dejas vacía usaremos el GPS de tu dispositivo.</>}
              />
            </div>
            <div className="form-actions">
              <Button type="submit" loading={loading} disabled={!desc} icon="next">{loading ? 'Procesando con IA…' : 'Analizar'}</Button>
              <Button variant="secondary" onClick={() => setSelectedTopic(null)}>Cancelar</Button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
