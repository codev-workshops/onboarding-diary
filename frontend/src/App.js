import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DiaryPage from './pages/DiaryPage';
import MilestonePage from './pages/MilestonePage';
import CreateRecruitPage from './pages/CreateRecruitPage';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recruits/new" element={<CreateRecruitPage />} />
          <Route path="/recruits/:id/diary" element={<DiaryPage />} />
          <Route path="/recruits/:id/milestones" element={<MilestonePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
