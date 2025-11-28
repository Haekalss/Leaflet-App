'use client';

export default function RouteModal({ isOpen, onClose, routeData, routes, selectedRouteIndex, onSelectRoute }) {
  if (!isOpen || !routeData) return null;

  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} menit`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
    } else {
      const days = Math.floor(hours / 24);
      const h = Math.round(hours % 24);
      return h > 0 ? `${days} hari ${h} jam` : `${days} hari`;
    }
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} menit`;
    } else {
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ffffff',
      borderTop: '3px solid #3b82f6',
      boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      maxHeight: '35vh',
      overflowY: 'auto',
      animation: 'slideUp 0.3s ease-out',
    }}>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ padding: '16px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span> {routeData.from.title} → {routeData.to.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Route Options - Google Maps Style */}
          {routes && routes.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {routes.map((route, index) => {
                const isSelected = index === selectedRouteIndex;
                const timeDiff = index > 0 ? route.duration - routes[0].duration : 0;
                
                return (
                  <div
                    key={index}
                    onClick={() => onSelectRoute(index)}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isSelected ? '#1e40af' : '#ffffff',
                      border: `2px solid ${isSelected ? '#1e40af' : '#d1d5db'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minWidth: '140px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: isSelected ? '#ffffff' : '#111827' 
                      }}>
                        {formatMinutes(route.duration)}
                      </span>
                      {index === 0 && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: isSelected ? '#93c5fd' : '#10b981',
                          fontWeight: '600',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#d1fae5',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          BEST
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      color: isSelected ? '#bfdbfe' : '#6b7280' 
                    }}>
                      {route.distance.toFixed(1)} km
                      {timeDiff > 0 && (
                        <span style={{ 
                          display: 'block',
                          fontSize: '11px',
                          color: isSelected ? '#fca5a5' : '#dc2626',
                          marginTop: '2px',
                        }}>
                          +{Math.round(timeDiff)} min
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transportation Modes */}
          <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {routeData.modes.map((mode, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <span style={{ fontSize: '20px' }}>{mode.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                    {mode.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {formatDuration(mode.duration)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
