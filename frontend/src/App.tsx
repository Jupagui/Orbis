import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layout/AppShell';
import Home from './pages/Home';
import CasoView from './features/casos/CasoView';
import Heatmap from './pages/Heatmap';
import Historial from './pages/Historial';
import Sistema from './pages/Sistema';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/casos/:id" element={<CasoView />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/sistema" element={<Sistema />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
