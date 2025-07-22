import './App.css';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ChatView from './pages/ChatView';
import Recipe from './pages/Recipe';
import Search from './pages/Search';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from './firebase';
import Login from './pages/Login';

function App() {
  const navigate = useNavigate();

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) {
        signInWithPopup(auth, new GoogleAuthProvider());
        navigate('/login');
      }
    });
    return unsub;
  },[]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/search" element={<Search />} />
      <Route path="/chat" element={<ChatView />} />
      <Route path="/recipe" element={<Recipe />} />
    </Routes>
  );
}

export default App;
