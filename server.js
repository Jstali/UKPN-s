// Simple CORS proxy server for Azure Function
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Proxy endpoint for DTC Audit API
app.get('/api/proxy/dtcAudit', async (req, res) => {
  try {
    const azureUrl = process.env.REACT_APP_AZURE_DTC_AUDIT_API;
    
    console.log('Proxying request to:', azureUrl);
    
    const response = await fetch(azureUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Azure API returned ${response.status}`,
      });
    }

    const data = await response.json();
    
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`CORS Proxy server running on http://localhost:${PORT}`);
});
