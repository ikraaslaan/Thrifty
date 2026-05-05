import { MapPin, Tag } from 'lucide-react';

// Backend'den gelen Item tipi
export interface Item {
  id: string;
  title: string;
  description: string;
  images: string[];
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  deliveryType: 'PICKUP' | 'DELIVERY' | 'BOTH';
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number; // km, haversine ile hesaplanmış
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

// Durum etiketi renk ve metin haritası
const CONDITION_MAP: Record<Item['condition'], { label: string; color: string; bg: string }> = {
  NEW:      { label: 'Sıfır',          color: '#3a7d44', bg: 'rgba(58,125,68,0.1)'   },
  LIKE_NEW: { label: 'Az Kullanılmış', color: '#2563EB', bg: 'rgba(37,99,235,0.08)'  },
  GOOD:     { label: 'İyi Durumda',    color: '#92400E', bg: 'rgba(146,64,14,0.1)'   },
  FAIR:     { label: 'Kullanılabilir', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

const DELIVERY_MAP: Record<Item['deliveryType'], string> = {
  PICKUP:   'Elden Teslim',
  DELIVERY: 'Kargolı',
  BOTH:     'Her İkisi',
};

interface ItemCardProps {
  item: Item;
  onClick?: (item: Item) => void;
}

const ItemCard = ({ item, onClick }: ItemCardProps) => {
  const cond = CONDITION_MAP[item.condition];
  const hasImage = item.images && item.images.length > 0;
  const firstChar = item.user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <article
      id={`item-card-${item.id}`}
      onClick={() => onClick?.(item)}
      className="group emboss-card overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        borderRadius: '1.25rem',
        transform: 'translateY(0)',
        willChange: 'transform, box-shadow',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 16px 40px rgba(74,59,50,0.12), 0 4px 12px rgba(74,59,50,0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      {/* ── Görsel Alanı ── */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '4/3', background: 'var(--color-paper)' }}
      >
        {hasImage ? (
          <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(74,59,50,0.06)' }}
            >
              <Tag size={28} style={{ color: 'var(--color-ink-light)', opacity: 0.5 }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
              Görsel Yok
            </span>
          </div>
        )}

        {/* Çoklu görsel göstergesi */}
        {item.images?.length > 1 && (
          <div
            className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              backdropFilter: 'blur(4px)',
            }}
          >
            +{item.images.length - 1}
          </div>
        )}

        {/* Durum etiketi */}
        <div className="absolute bottom-3 left-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              color: cond.color,
              background: cond.bg,
              backdropFilter: 'blur(8px)',
              border: `1px solid ${cond.color}22`,
            }}
          >
            {cond.label}
          </span>
        </div>
      </div>

      {/* ── İçerik Alanı ── */}
      <div className="p-4">

        {/* Kategori */}
        {item.category && (
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--color-artisan-sage-dark)' }}
          >
            {item.category.icon} {item.category.name}
          </p>
        )}

        {/* Başlık */}
        <h3
          className="font-serif font-semibold text-base leading-snug mb-2 line-clamp-2"
          style={{ color: 'var(--color-ink-dark)' }}
        >
          {item.title}
        </h3>

        {/* Alt bilgiler */}
        <div className="flex items-center justify-between mt-3">

          {/* Mesafe */}
          <div className="flex items-center gap-1">
            <MapPin size={13} style={{ color: 'var(--color-artisan-earth)', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--color-ink-light)' }}>
              {item.distance != null
                ? `${item.distance} km`
                : item.address
                ? item.address.split(',')[0]
                : 'Konum belirtilmedi'}
            </span>
          </div>

          {/* Teslim tipi */}
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(74,59,50,0.05)',
              color: 'var(--color-ink-light)',
            }}
          >
            {DELIVERY_MAP[item.deliveryType]}
          </span>
        </div>

        {/* Bağışçı */}
        {item.user && (
          <div
            className="flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: '1px solid rgba(74,59,50,0.06)' }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ background: 'var(--color-artisan-earth)' }}
            >
              {firstChar}
            </div>
            <span className="text-xs truncate" style={{ color: 'var(--color-ink-light)' }}>
              {item.user.fullName}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export default ItemCard;
