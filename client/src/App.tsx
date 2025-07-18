// ...existing code...
import './App.css';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ChatView from './pages/ChatView';
import Recipe from './pages/Recipe';
import Search from './pages/Search';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/search" element={<Search />} />
      <Route path="/chat" element={<ChatView />} />
      <Route path="/recipe" element={<Recipe />} />
    </Routes>
  );
}

export default App;
