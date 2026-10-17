import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, IconSprite, type IconName } from '../ui/Icon';
import { ThemeSwitch } from '../ui/Inputs';
import { ToastProvider } from '../ui/Toast';
import { OrbitBackdrop } from '../ui/backgrounds/OrbitBackdrop';
import { BlueprintBackdrop } from '../ui/backgrounds/BlueprintBackdrop';
import { Constellation } from '../ui/backgrounds/Constellation';
import { SealTrace } from '../ui/backgrounds/SealTrace';
import { cls } from '../ui/cls';

const NAV: { to: string; texto: string; icon: IconName; fin?: boolean }[] = [
  { to: '/', texto: 'Inicio', icon: 'orbita', fin: true },
  { to: '/historial', texto: 'Historial', icon: 'historial' },
  { to: '/heatmap', texto: 'Tablero', icon: 'tablero' },
  { to: '/sistema', texto: 'Sistema', icon: 'compas' },
];

/** Cada zona de la app tiene su propio fondo animado. El Tablero usa el mapa completo y no lleva fondo. */
function Fondo({ ruta }: { ruta: string }) {
  if (ruta === '/') return <div className={cls('backdrop', 'is-home')} key="home"><div className="photo" /><div className="aura a1" /><div className="aura a2" /><OrbitBackdrop /><div className="scrim" /></div>;
  if (ruta.startsWith('/historial')) return <div className="backdrop" key="hist"><BlueprintBackdrop /><div className="scrim" /></div>;
  if (ruta.startsWith('/casos')) return <div className="backdrop" key="caso"><Constellation /><div className="scrim" /></div>;
  if (ruta.startsWith('/sistema')) return <div className="backdrop" key="sis"><SealTrace /><div className="scrim" /></div>;
  return null;
}

function Marca() {
  return (
    <NavLink to="/" className="brand" aria-label="ORBIS, ir al inicio">
      <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="ring-o" cx="20" cy="20" r="10" />
        <g className="spinner">
          <ellipse className="orbit" cx="20" cy="20" rx="18" ry="6.5" transform="rotate(-22 20 20)" />
          <circle className="moon" cx="36.7" cy="13.3" r="2.2" />
        </g>
      </svg>
      <span className="brand-word">ORBIS</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <ToastProvider>
      <div className="shell">
        <IconSprite />
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <Fondo ruta={pathname} />

        <header className="topbar">
          <Marca />
          <nav className="nav-links" aria-label="Principal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.fin}><Icon name={n.icon} />{n.texto}</NavLink>
            ))}
          </nav>
          <div className="topbar-actions"><ThemeSwitch /></div>
        </header>

        <main id="contenido" className="shell-main" tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.fin}><Icon name={n.icon} />{n.texto}</NavLink>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}
