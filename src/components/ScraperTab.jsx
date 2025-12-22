import React, { useState, useEffect } from 'react';
import { scraperService } from '../services/scraperService';
import { Button, Card, CardContent, Typography, Box, Alert, CircularProgress, Chip, Divider } from '@mui/material';
import { PlayArrow, Refresh, CheckCircle, Error, SportsEsports, Casino } from '@mui/icons-material';

const ScraperTab = () => {
  const [scrapers, setScrapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');

  const bookieConfig = {
    fetchBCgame: { name: 'BC.Game', icon: <Casino />, color: '#ff6b35' },
    fetchF: { name: 'SportyBet', icon: <SportsEsports />, color: '#4CAF50' },
    fetchFootball: { name: 'Football.com', icon: <SportsEsports />, color: '#2196F3' },
    fetchMsportAxios: { name: 'MSport', icon: <SportsEsports />, color: '#9C27B0' }
  };

  useEffect(() => {
    loadScrapers();
    checkServerHealth();
  }, []);

  const loadScrapers = async () => {
    try {
      const data = await scraperService.getScrapers();
      setScrapers(data.scrapers);
    } catch (err) {
      setError('Failed to load scrapers');
      console.error(err);
    }
  };

  const checkServerHealth = async () => {
    try {
      await scraperService.checkHealth();
      setServerStatus('online');
    } catch (err) {
      setServerStatus('offline');
      setError('Backend server is not running');
    }
  };

  const runScraper = async (scraperName) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await scraperService.scrapeBookie(scraperName);
      setResults(prev => ({
        ...prev,
        [scraperName]: result
      }));
    } catch (err) {
      setError(`Failed to run ${scraperName} scraper: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBookieKey = (scraperName) => {
    return Object.keys(bookieConfig).find(key => scraperName.includes(key.replace('fetch', '').toLowerCase())) || scraperName;
  };

  if (serverStatus === 'offline') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Backend server is not running. Please start the server with: <code>node server.js</code>
        </Alert>
        <Button variant="contained" onClick={checkServerHealth}>
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Betting Scrapers
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
        {scrapers.map((scraper) => {
          const bookieKey = getBookieKey(scraper.name);
          const config = bookieConfig[bookieKey] || { name: scraper.name, icon: <SportsEsports />, color: '#666' };
          const result = results[scraper.name];
          
          return (
            <Card key={scraper.name} sx={{ position: 'relative' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: config.color, mr: 1 }}>
                    {config.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {config.name}
                  </Typography>
                  <Chip 
                    label={scraper.supported ? 'Supported' : 'Unsupported'} 
                    size="small" 
                    color={scraper.supported ? 'success' : 'default'}
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {scraper.file}
                </Typography>

                {result && (
                  <Box sx={{ mb: 2 }}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {result.success ? (
                        <CheckCircle color="success" sx={{ mr: 1 }} />
                      ) : (
                        <Error color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body2">
                        {result.success ? `Found ${result.count} bets` : 'Failed'}
                      </Typography>
                    </Box>
                    
                    {result.success && result.data && result.data.length > 0 && (
                      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                        <Typography variant="caption" color="text.secondary">
                          Recent bets:
                        </Typography>
                        {result.data.slice(0, 3).map((bet, index) => (
                          <Box key={index} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                            <strong>{bet.ID || bet['Ticket ID']}</strong> - {bet.Status} - {bet.Stake || bet['Stake']}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={() => runScraper(scraper.name)}
                  disabled={loading || !scraper.supported}
                  fullWidth
                >
                  {loading ? 'Running...' : 'Run Scraper'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScraperTab;
