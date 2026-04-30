import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './stores/useAuthStore';

function HomePage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="font-serif text-4xl font-bold text-ink-dark mb-4">Hoş Geldiniz, {user?.fullName || 'Değerli Üyemiz'}</h1>
      <p className="text-ink-light mb-8">İyilik ve paylaşım serüveninize buradan başlayabilirsiniz.</p>
      <button onClick={logout} className="tactile-btn bg-artisan-orange text-white px-8 py-3">
        Çıkış Yap
      </button>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
