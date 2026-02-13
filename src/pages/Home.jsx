import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell, Activity } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'DTC Audit',
      description: 'View and manage DTC audit records',
      icon: <FileText size={40} />,
      path: '/dtc-audit'
    },
    {
      title: 'SAP Audit',
      description: 'View and manage SAP audit records',
      icon: <Database size={40} />,
      path: '/sap-audit'
    },
    {
      title: 'Subscriptions',
      description: 'Create and manage subscription rules',
      icon: <Bell size={40} />,
      path: '/subscriptions'
    },
    {
      title: 'DTC Activity',
      description: 'Search and view DTC activity logs',
      icon: <Activity size={40} />,
      path: '/dtc-activity'
    }
  ];

  return (
    <div className="page-container">
      <div className="home-hero">
        <div className="home-content">
          <h1 className="page-title">Welcome to UKPN Portal</h1>
          <div className="cards-grid">
            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(card.path)}
              >
                <div className="card-icon">
                  {card.icon}
                </div>
                <h2 className="card-title">{card.title}</h2>
                <p className="card-description">{card.description}</p>
              </motion.div>
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
