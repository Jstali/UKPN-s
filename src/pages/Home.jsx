import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Database, Bell } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'DTC Audit',
      description: 'View and manage DTC audit records',
      icon: <FileText size={40} />,
      path: '/dtc-audit',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
    },
    {
      title: 'SAP Audit',
      description: 'View and manage SAP audit records',
      icon: <Database size={40} />,
      path: '/sap-audit',
      gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)'
    },
    {
      title: 'Subscriptions',
      description: 'Create and manage subscription rules',
      icon: <Bell size={40} />,
      path: '/subscriptions',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
    }
  ];

  return (
    <div className="page-container">
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
            <div className="card-icon" style={{ background: card.gradient }}>
              {card.icon}
            </div>
            <h2 className="card-title">{card.title}</h2>
            <p className="card-description">{card.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Home;
