import React, { useState } from 'react';
import { User, LogOut, Settings } from 'lucide-react';

const Header = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="header">
      <img src={`${process.env.PUBLIC_URL}/ukpn-logo.svg`} alt="UKPN" className="header-logo" />
      <div className="profile-container">
        <div 
          className="user-profile" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <User size={24} />
          <span>Profile</span>
        </div>
        {showDropdown && (
          <div className="profile-dropdown">
            <button className="dropdown-item">
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button className="dropdown-item">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
