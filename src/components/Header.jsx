import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogOut, RefreshCw } from 'lucide-react';

const Header = ({ user, onLogout, autoRefresh, setAutoRefresh }) => {
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const updateGreeting = () => {
      const ukTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
      const hour = new Date(ukTime).getHours();

      if (hour < 12) {
        setGreeting('Good morning');
      } else if (hour < 18) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img 
            src={`${process.env.PUBLIC_URL}/ukpn-logo.svg`}
            alt="UKPN"
            style={{ height: '36px', width: 'auto' }}
          />
        </Link>
        {user && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '20px', 
            marginLeft: 'auto'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {greeting}, {user.role === 'Business' ? 'User' : user.username.charAt(0).toUpperCase() + user.username.slice(1)}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON (1 min)' : 'Auto-refresh OFF'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                background: autoRefresh ? '#16a34a' : '#e5e7eb',
                border: 'none',
                borderRadius: '7px',
                color: autoRefresh ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={14} style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
              {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 15px',
                  background: '#d44009',
                  border: 'none',
                  borderRadius: '7px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                <User size={18} />
                <span>{user.role}</span>
              </button>
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  bottom: 'auto',
                  right: 0,
                  marginTop: '8px',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '150px',
                  overflow: 'hidden',
                  zIndex: 1000
                }}>
                  <button
                    onClick={onLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: 'white',
                      border: 'none',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
