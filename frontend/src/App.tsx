import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CasoView from './features/casos/CasoView';
import Heatmap from './pages/Heatmap';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/casos/:id" element={<CasoView />} />
        <Route path="/heatmap" element={<Heatmap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
