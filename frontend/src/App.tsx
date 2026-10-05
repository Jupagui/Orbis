import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CasoView from './features/casos/CasoView';
import Heatmap from './pages/Heatmap';
import Historial from './pages/Historial';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/casos/:id" element={<CasoView />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="/historial" element={<Historial />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
