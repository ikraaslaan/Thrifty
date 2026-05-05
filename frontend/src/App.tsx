import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import { useAuthStore } from './stores/useAuthStore';

// Layout: Navbar + sayfa içeriği (auth gerektirmeyen sayfalarda da navbar göster)
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

// Auth gerektiren route guard
function PrivateRoute({ element }: { element: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{element}</> : <Navigate to="/login" replace />;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth sayfaları — Navbar yok, giriş yapmış kullanıcıyı ana sayfaya yönlendir */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />}
        />

        {/* Ana sayfa — Navbar var, herkese açık */}
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />

        {/* Korumalı sayfalar (ileride eklenecek) */}
        <Route
          path="/donate"
          element={
            <PrivateRoute
              element={
                <Layout>
                  <div className="pt-24 flex items-center justify-center min-h-screen">
                    <p className="font-serif text-2xl text-ink-dark">Bağış formu yakında geliyor...</p>
                  </div>
                </Layout>
              }
            />
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute
              element={
                <Layout>
                  <div className="pt-24 flex items-center justify-center min-h-screen">
                    <p className="font-serif text-2xl text-ink-dark">Profil sayfası yakında geliyor...</p>
                  </div>
                </Layout>
              }
            />
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

