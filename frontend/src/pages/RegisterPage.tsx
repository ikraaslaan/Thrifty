import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { Leaf, ArrowRight, Sun, Bird, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const { register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });
      navigate('/'); // Usually redirects to home/dashboard
    } catch (err) {
      console.error("Register failed", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 relative z-10 font-sans">
      
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-12 lg:gap-24 items-center">
        
        {/* Left Side: Editorial / Artisanal Graphic */}
        <div className="hidden md:flex flex-col w-1/2 relative">
          
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-artisan-sage rounded-full flex items-center justify-center text-white">
              <Leaf size={20} strokeWidth={2.5} />
            </div>
            <span className="font-serif italic text-xl text-ink-light tracking-wide">Thrifty</span>
          </div>

          <h1 className="font-serif text-5xl lg:text-7xl font-bold text-ink-dark leading-[1.1] tracking-tight mb-8">
            Yüklerinden Kurtul,<br />
            <span className="text-artisan-sage italic font-medium">İyiliği Paylaş.</span>
          </h1>
          
          <p className="text-ink-light text-lg lg:text-xl leading-relaxed max-w-md font-sans font-light mb-12">
            Zamanın ruhunu yakalayan, ancak eski yardımlaşma kültürünün samimiyetini barındıran yapay zeka destekli iyilik platformu. Atık değil, miras bırakın.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 text-artisan-orange">
                <Sun size={24} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink-dark text-lg mb-1">Yeni Bir Gün</h4>
                <p className="text-sm text-ink-light leading-relaxed">Kullanmadığınız her şeyin yeni bir hikayesi var.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 text-artisan-earth">
                <Bird size={24} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-ink-dark text-lg mb-1">Özgürleşin</h4>
                <p className="text-sm text-ink-light leading-relaxed">Fazlalıklardan arının, ihtiyaç sahiplerine umut olun.</p>
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Side: Tactile Form */}
        <div className="w-full md:w-1/2 flex justify-center lg:justify-end">
          <div className="emboss-card w-full max-w-md p-8 md:p-12 relative overflow-hidden">
            
            <div className="mb-10 text-center">
              <h2 className="font-serif text-3xl font-bold text-ink-dark mb-2">Aramıza Katılın</h2>
              <p className="text-ink-light font-light text-sm">Temiz, şeffaf ve %100 iyilik odaklı.</p>
            </div>

            {error && (
              <div className="mb-8 p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 text-sm font-medium flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="relative">
                <div className={`flex transition-transform duration-500 ease-in-out ${step === 2 ? '-translate-x-full absolute opacity-0 pointer-events-none' : 'translate-x-0 w-full'}`}>
                  <div className="w-full space-y-8 shrink-0">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-ink-light mb-2">Adınız & Soyadınız</label>
                      <input 
                        type="text" 
                        name="fullName"
                        required={step === 1}
                        placeholder="Zarif bir şekilde giriniz..."
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="tactile-input w-full pb-3 text-ink-dark placeholder:text-ink-light/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-ink-light mb-2">E-posta Adresi</label>
                      <input 
                        type="email" 
                        name="email"
                        required={step === 1}
                        placeholder="iletisim@ornek.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="tactile-input w-full pb-3 text-ink-dark placeholder:text-ink-light/50"
                      />
                    </div>
                  </div>
                </div>

                <div className={`flex transition-transform duration-500 ease-in-out ${step === 1 ? 'translate-x-full absolute opacity-0 pointer-events-none' : 'translate-x-0 w-full'}`}>
                  <div className="w-full space-y-8 shrink-0">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-ink-light mb-2">Güvenlik Şifreniz</label>
                      <input 
                        type="password" 
                        name="password"
                        required={step === 2}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="tactile-input w-full pb-3 text-ink-dark placeholder:text-ink-light/50 tracking-widest"
                      />
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-artisan-sage/10 rounded-xl border border-artisan-sage/20">
                      <ShieldCheck className="text-artisan-sage shrink-0 mt-0.5" size={20} />
                      <p className="text-xs text-ink-dark leading-relaxed">
                        Verileriniz güvendedir. Platformumuz, etik yapay zeka standartlarıyla çalışır ve asla kar amacı gütmez.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="tactile-btn w-full bg-artisan-orange text-white py-4 flex items-center justify-center gap-2 text-sm tracking-wide"
                >
                  {isLoading ? 'Lütfen Bekleyiniz...' : step === 1 ? 'İlerleyelim' : 'Topluluğa Katıl'}
                  {!isLoading && step === 1 && <ArrowRight size={16} />}
                </button>
                
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-ink-light hover:text-ink-dark tracking-wide uppercase text-center transition-colors py-2"
                  >
                    Geri Dön
                  </button>
                )}
              </div>
            </form>

            <div className="mt-10 text-center border-t border-ink-dark/5 pt-6">
              <p className="text-sm text-ink-light">
                Zaten bir üye misiniz?{' '}
                <Link to="/login" className="font-semibold text-artisan-orange hover:text-artisan-orange-dark transition-colors">
                  Giriş Yapın
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
