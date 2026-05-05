import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  User,
  LogIn,
  Gift,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [location, setLocation] = useState('Konumunuzu Seçin');
  const [locationEditing, setLocationEditing] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleLocationConfirm = () => {
    if (locationInput.trim()) setLocation(locationInput.trim());
    setLocationEditing(false);
    setLocationInput('');
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Glass backdrop */}
        <div
          className="w-full"
          style={{
            background: 'rgba(247, 244, 240, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(74, 59, 50, 0.08)',
            boxShadow: '0 2px 24px rgba(74, 59, 50, 0.06)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

            {/* ── LEFT: Brand ── */}
            <Link
              to="/"
              className="flex-shrink-0 flex items-center gap-2 group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'var(--color-artisan-orange)' }}
              >
                T
              </div>
              <span
                className="font-serif font-bold text-xl hidden sm:block"
                style={{ color: 'var(--color-ink-dark)' }}
              >
                Thrifty
              </span>
            </Link>

            {/* ── CENTER: Search + Location ── */}
            <div className="flex-1 flex items-center gap-2 min-w-0">

              {/* Search bar */}
              <form
                onSubmit={handleSearch}
                className="flex-1 flex items-center gap-2 rounded-full px-4 py-2 min-w-0"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(74, 59, 50, 0.12)',
                  boxShadow: 'inset 0 1px 3px rgba(74,59,50,0.05)',
                }}
              >
                <Search
                  size={16}
                  style={{ color: 'var(--color-ink-light)', flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Ürün, kategori veya kullanıcı ara..."
                  className="flex-1 bg-transparent text-sm outline-none min-w-0"
                  style={{
                    color: 'var(--color-ink-dark)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue('')}
                    style={{ color: 'var(--color-ink-light)', flexShrink: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </form>

              {/* Location picker */}
              <div className="relative flex-shrink-0">
                <button
                  id="location-picker-btn"
                  onClick={() => {
                    setLocationEditing(!locationEditing);
                    setLocationInput('');
                  }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(130, 162, 132, 0.12)',
                    border: '1px solid rgba(130,162,132,0.3)',
                    color: 'var(--color-artisan-sage-dark)',
                    fontFamily: 'var(--font-sans)',
                    maxWidth: '160px',
                  }}
                >
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <span className="truncate hidden md:block" style={{ maxWidth: '100px' }}>
                    {location}
                  </span>
                  <ChevronDown size={12} style={{ flexShrink: 0 }} />
                </button>

                {/* Location dropdown */}
                {locationEditing && (
                  <div
                    className="absolute top-full mt-2 right-0 w-64 rounded-2xl p-4 z-50"
                    style={{
                      background: '#fff',
                      boxShadow: '0 8px 32px rgba(74,59,50,0.12)',
                      border: '1px solid rgba(74,59,50,0.08)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: 'var(--color-ink-light)' }}
                    >
                      Konum Girin
                    </p>
                    <input
                      autoFocus
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLocationConfirm()}
                      placeholder="İstanbul, Kadıköy..."
                      className="w-full text-sm outline-none pb-2 mb-3"
                      style={{
                        borderBottom: '2px solid rgba(74,59,50,0.15)',
                        color: 'var(--color-ink-dark)',
                        fontFamily: 'var(--font-sans)',
                        background: 'transparent',
                      }}
                    />
                    <button
                      onClick={handleLocationConfirm}
                      className="tactile-btn w-full py-2 text-sm text-white"
                      style={{ background: 'var(--color-artisan-sage)' }}
                    >
                      Konumu Uygula
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Auth State ── */}
            <div className="flex-shrink-0 flex items-center gap-2">

              {!isAuthenticated ? (
                /* Public: Giriş Yap */
                <Link
                  to="/login"
                  id="navbar-login-btn"
                  className="tactile-btn flex items-center gap-2 px-4 py-2 text-sm text-white"
                  style={{ background: 'var(--color-ink-dark)' }}
                >
                  <LogIn size={15} />
                  <span className="hidden sm:inline">Giriş Yap</span>
                </Link>
              ) : (
                /* Auth: Bağış Yap + Profil */
                <>
                  <Link
                    to="/donate"
                    id="navbar-donate-btn"
                    className="tactile-btn flex items-center gap-2 px-4 py-2 text-sm text-white"
                    style={{ background: 'var(--color-artisan-orange)' }}
                  >
                    <Gift size={15} />
                    <span className="hidden sm:inline">Bağış Yap</span>
                  </Link>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      id="navbar-profile-btn"
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 rounded-full transition-all duration-200 hover:scale-105"
                      style={{
                        background: 'rgba(74,59,50,0.08)',
                        padding: '6px 12px 6px 6px',
                        border: '1px solid rgba(74,59,50,0.1)',
                      }}
                    >
                      {/* Avatar circle */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ background: 'var(--color-artisan-earth)' }}
                      >
                        {user?.fullName?.charAt(0)?.toUpperCase() ?? <User size={14} />}
                      </div>
                      <span
                        className="text-sm font-medium hidden sm:block"
                        style={{ color: 'var(--color-ink-dark)' }}
                      >
                        {user?.fullName?.split(' ')[0] ?? 'Profil'}
                      </span>
                      <ChevronDown size={13} style={{ color: 'var(--color-ink-light)' }} />
                    </button>

                    {profileOpen && (
                      <div
                        className="absolute top-full mt-2 right-0 w-48 rounded-2xl overflow-hidden z-50"
                        style={{
                          background: '#fff',
                          boxShadow: '0 8px 32px rgba(74,59,50,0.12)',
                          border: '1px solid rgba(74,59,50,0.08)',
                        }}
                      >
                        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(74,59,50,0.06)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink-dark)' }}>
                            {user?.fullName}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-ink-light)' }}>
                            {user?.email}
                          </p>
                        </div>
                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-paper"
                            style={{ color: 'var(--color-ink-dark)' }}
                          >
                            <User size={14} />
                            Profilim
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-red-50 text-red-600"
                          >
                            <LogIn size={14} className="rotate-180" />
                            Çıkış Yap
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdowns */}
      {(locationEditing || profileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setLocationEditing(false);
            setProfileOpen(false);
          }}
        />
      )}
    </>
  );
};

export default Navbar;
