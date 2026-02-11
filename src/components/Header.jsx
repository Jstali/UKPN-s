import React from 'react';
import { User } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <img src="/ukpn-logo.svg" alt="UKPN" className="header-logo" />
      <div className="user-icon">
        <User size={24} />
      </div>
    </header>
  );
};

export default Header;
