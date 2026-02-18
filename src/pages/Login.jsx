import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, ShieldCheck, User } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const users = [
    { username: 'business', password: 'business123', role: 'Business' },
    { username: 'monitoring', password: 'monitoring123', role: 'Monitoring Team' },
    { username: 'support', password: 'support123', role: 'Core Support' },
    { username: 'admin', password: 'admin123', role: 'Admin' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedUsername = username.trim();
    const user = users.find(
      (u) => u.username === normalizedUsername && u.password === password
    );
    
    if (user) {
      onLogin(user);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  const fillCredentials = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setError('');
  };

  return (
    <div className="ukpn-login-page">
      <motion.div
        className="ukpn-login-layout"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <aside className="ukpn-login-brand">
          <img
            src={`${process.env.PUBLIC_URL}/23134_ukpn_ar_23_doc_download_link_309x232px.avif`}
            alt="UKPN document"
            className="ukpn-login-doc"
          />
        </aside>

        <section className="ukpn-login-card-shell">
          <motion.div
            className="ukpn-login-card"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="ukpn-login-card-top">
              <img 
                src={`${process.env.PUBLIC_URL}/ukpn-logo.svg`}
                alt="UKPN"
                className="ukpn-login-card-logo"
              />
            </div>
            <h2 className="ukpn-login-card-title">Welcome back</h2>
            <p className="ukpn-login-card-text">
              Sign in with your assigned credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="ukpn-login-form">
              <div className="ukpn-login-field">
                <label>
                Username
                </label>
                <div className="ukpn-login-input-wrap">
                  <User size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>
              </div>

              <div className="ukpn-login-field">
                <label>
                Password
                </label>
                <div className="ukpn-login-input-wrap">
                  <Lock size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              </div>

              {error && (
                <motion.div
                  className="ukpn-login-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <button type="submit" className="ukpn-login-submit">
                <span>Sign in to dashboard</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
};

export default Login;
