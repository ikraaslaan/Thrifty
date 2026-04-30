import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Leaf, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(credentials);
      navigate('/');
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 relative z-10 font-sans">
      
      <div className="w-full max-w-4xl flex flex-col items-center justify-center">
        
        {/* Header graphic */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-artisan-sage rounded-full flex items-center justify-center text-white mb-4 shadow-sm">
            <Leaf size={24} strokeWidth={2.5} />
          </div>
          <h1 className="font-serif text-4xl font-bold text-ink-dark mb-2 tracking-tight">Tekrar Hoş Geldiniz</h1>
          <p className="text-ink-light font-light text-center max-w-sm">
            Dünyayı biraz daha hafifletmek için buradasınız. İyilik serüveninize devam edin.
          </p>
        </div>

        {/* Tactile Form */}
        <div className="emboss-card w-full max-w-md p-8 md:p-12 relative">
          
          {error && (
            <div className="mb-8 p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 text-sm font-medium flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-ink-light mb-2">E-posta Adresi</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="iletisim@ornek.com"
                value={credentials.email}
                onChange={handleInputChange}
                className="tactile-input w-full pb-3 text-ink-dark placeholder:text-ink-light/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-ink-light">Şifreniz</label>
                <a href="#" className="text-xs text-artisan-earth hover:text-artisan-orange transition-colors">Şifremi Unuttum</a>
              </div>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••"
                value={credentials.password}
                onChange={handleInputChange}
                className="tactile-input w-full pb-3 text-ink-dark placeholder:text-ink-light/50 tracking-widest"
              />
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="tactile-btn w-full bg-ink-dark hover:bg-ink-dark/90 text-white py-4 flex items-center justify-center gap-2 text-sm tracking-wide"
              >
                {isLoading ? 'Giriş Yapılıyor...' : 'Oturum Aç'}
                {!isLoading && <LogIn size={16} />}
              </button>
            </div>
            
          </form>

          <div className="mt-10 text-center border-t border-ink-dark/5 pt-6">
            <p className="text-sm text-ink-light">
              Henüz ailemize katılmadınız mı?{' '}
              <Link to="/register" className="font-semibold text-artisan-sage hover:text-artisan-sage-dark transition-colors">
                Kayıt Olun
              </Link>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LoginPage;
