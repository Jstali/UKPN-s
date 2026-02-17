import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, Activity } from 'lucide-react';
import { ShineBorder } from '../components/ui/shine-border';

const Home = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'DTC Audit',
      description: 'View and manage DTC audit records',
      icon: <FileText size={40} />,
      path: '/dtc-audit',
      lastUpdated: '2026-02-16 14:30:00'
    },
    {
      title: 'SAP Audit',
      description: 'View and manage SAP audit records',
      icon: <Database size={40} />,
      path: '/sap-audit',
      lastUpdated: '2026-02-16 14:25:00'
    },
    {
      title: 'Subscriptions',
      description: 'Create and manage subscription rules',
      icon: <Bell size={40} />,
      path: '/subscriptions',
      lastUpdated: '2026-02-16 14:20:00'
    },
    {
      title: 'DTC Activity',
      description: 'Search and view DTC activity logs',
      icon: <Activity size={40} />,
      path: '/dtc-activity',
      lastUpdated: '2026-02-16 14:15:00'
    }
  ];

  return (
    <div className="page-container">
      <div className="home-hero">
        <div className="home-content">
          <h1 className="page-title">Welcome to UKPN Portal</h1>
          <div className="cards-grid">
            {cards.map((card, index) => (
              <ShineBorder
                key={card.title}
                className="card"
                color={["#4c4ebd", "#B16207", "#F8AF59"]}
                borderRadius={12}
                borderWidth={2}
                duration={10}
                onClick={() => navigate(card.path)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="card-icon">
                    {card.icon}
                  </div>
                  <h2 className="card-title">{card.title}</h2>
                  <p className="card-description">{card.description}</p>
                </motion.div>
              </ShineBorder>
            ))}
          </div>
        </div>
        <div className="home-image">
          <img 
            src={`${process.env.PUBLIC_URL}/100_website_hero-graphic-2025_artwork.avif`}
            alt="UKPN Network"
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
