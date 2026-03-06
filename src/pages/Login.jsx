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
      {/* Background decorative elements */}
      <div className="ukpn-login-texture" />
      <div className="ukpn-login-orb ukpn-login-orb--red" />
      <div className="ukpn-login-orb ukpn-login-orb--blue" />
      <div className="ukpn-login-orb ukpn-login-orb--green" />
      <div className="ukpn-login-sparks">
        <div className="spark-line" style={{ top: '18%', width: '180px', animationDuration: '6s', animationDelay: '0s' }} />
        <div className="spark-line" style={{ top: '42%', width: '120px', animationDuration: '8s', animationDelay: '2s' }} />
        <div className="spark-line" style={{ top: '65%', width: '200px', animationDuration: '7s', animationDelay: '4s' }} />
        <div className="spark-line" style={{ top: '82%', width: '150px', animationDuration: '9s', animationDelay: '1s' }} />
        <div className="spark-line" style={{ top: '30%', width: '100px', animationDuration: '10s', animationDelay: '5s' }} />
      </div>

      <motion.div
        className="ukpn-login-layout"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <aside className="ukpn-login-brand">
          <img
            src={`${process.env.PUBLIC_URL}/Ukpn image 1.avif`}
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
