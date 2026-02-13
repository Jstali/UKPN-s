import React from 'react';
import { Facebook, Twitter, Youtube, Linkedin, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <a href="#" className="footer-link">Privacy Notice</a>
          <span className="footer-separator">•</span>
          <a href="#" className="footer-link">Terms and Conditions</a>
          <span className="footer-separator">•</span>
          <a href="#" className="footer-link">Cookie policy</a>
          <span className="footer-separator">•</span>
          <a href="#" className="footer-link">Modern Slavery Act</a>
          <span className="footer-separator">•</span>
          <a href="#" className="footer-link">Accessibility</a>
        </div>
        <div className="footer-social">
          <span className="footer-chat">Chat with us online</span>
          <a href="#" className="social-icon"><Facebook size={20} /></a>
          <a href="#" className="social-icon"><Twitter size={20} /></a>
          <a href="#" className="social-icon"><Youtube size={20} /></a>
          <a href="#" className="social-icon"><Linkedin size={20} /></a>
          <a href="#" className="social-icon"><MessageCircle size={20} /></a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
