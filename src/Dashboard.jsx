import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import UserPic from "/assets/i.jpeg";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

import OverviewTab from './components/OverviewTab';
import BettingBehaviorTab from './components/BettingBehaviorTab';
import PsychologyTab from './components/PsychologyTab';
import DiceLoader from './components/DiceLoader';
import toast from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';

import { FaPlus } from "react-icons/fa"

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

const formatCurrency = (amount) => {
  return '₦' + new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
};

const Balance = ({ amount }) => {
  return (
    <div className="Balance">
      <h2>{formatCurrency(amount || 0)}</h2>
      <h5>YOUR BALANCE</h5>
    </div>
  );
};



const TIME_PERIODS = [
  { key: '1d', label: 'Day', days: 1 },
  { key: '1w', label: 'Week', days: 7 },
  { key: '1m', label: 'Month', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: null },
];

const Dashboard = ({ activeBookie }) => {
  const [rawBets, setRawBets] = useState([]);
  const [value, setValue] = useState(0);
  const [syncedBookies, setSyncedBookies] = useState([]);
  const [linkedAccounts, setLinkedAccounts] = useState([]); // { bookie, username, lastSync }[]
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [forceFullSync, setForceFullSync] = useState(false);
  const [selectedBookie, setSelectedBookie] = useState('all'); // 'all' or bookie name
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all'); // key from TIME_PERIODS
  const [profile, setProfile] = useState({ balance: 0, nickname: 'User' });
  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Helper function to safely parse numbers
  const cleanNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  const isSyncingRef = React.useRef(false);
  const pollIntervalRef = React.useRef(null);

  const refreshBets = useCallback(async (isPoll = false) => {
    const token = localStorage.getItem('bt_token');
    if (!token) return;

    try {
      if (!isPoll) setIsLoading(true);
      const response = await fetch(`/api/bets/all${isPoll ? '?isPoll=true' : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setRawBets(result.data || []);
        setIsSyncing(result.isSyncing || false);
        isSyncingRef.current = result.isSyncing || false;

        if (!isPoll && result.data?.length > 0) {
          toast.success(`Data loaded (${result.data.length} bets)`, { id: 'data-loaded' });
        } else if (!isPoll && !result.isSyncing && result.data?.length === 0) {
          toast.error('No bets found', { id: 'data-loaded' });
        }
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      if (!isPoll) setIsLoading(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('bt_token');
    if (!token) return;

    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setProfile({ balance: result.balance, nickname: result.nickname });
        localStorage.setItem('bt_balance', result.balance);
        localStorage.setItem('bt_nickname', result.nickname);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  const fetchBookies = useCallback(async () => {
    const token = localStorage.getItem('bt_token');
    if (!token) return;

    try {
      const bookieRes = await fetch(`/api/user/bookies`, { headers: { 'Authorization': `Bearer ${token}` } });
      const bookieData = await bookieRes.json();
      if (bookieData.success) {
        if (bookieData.bookies) setSyncedBookies(bookieData.bookies);
        if (bookieData.accounts) setLinkedAccounts(bookieData.accounts);
        return bookieData.accounts;
      }
    } catch (err) {
      console.error("Error fetching bookies:", err);
    }
    return null;
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const token = localStorage.getItem('bt_token');

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch('/api/sync/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const statusResult = await statusRes.json();
        
        const wasSync = isSyncingRef.current;
        const isNowSync = statusResult.isSyncing || false;

        if (wasSync && !isNowSync) {
          // Sync just finished!
          const accounts = await fetchBookies();
          await fetchProfile();
          await refreshBets(false);

          if (accounts && accounts.some(a => a.syncError)) {
            const failed = accounts.find(a => a.syncError);
            toast.error(`Sync partially failed: ${failed.syncError}`, { id: 'sync-finished', duration: 6000 });
          } else {
            toast.success('Background sync complete!', { id: 'sync-finished' });
          }

          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (!isNowSync && pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setIsSyncing(isNowSync);
        isSyncingRef.current = isNowSync;
      } catch (err) {
        console.error("Poller error:", err);
      }
    }, 5000);
  }, [fetchBookies, fetchProfile, refreshBets]);

  useEffect(() => {
    toast.dismiss();
    
    const init = async () => {
      await fetchProfile();
      await fetchBookies();
      await refreshBets(false);
      
      // If we are currently syncing, start the poller
      const token = localStorage.getItem('bt_token');
      const statusRes = await fetch('/api/sync/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statusResult = await statusRes.json();
      if (statusResult.isSyncing) {
        setIsSyncing(true);
        isSyncingRef.current = true;
        startPolling();
      }
    };

    init();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchProfile, fetchBookies, refreshBets, startPolling]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    
    try {
      const token = localStorage.getItem('bt_token');
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceFullSync })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Sync started for all accounts');
        setIsSyncing(true);
        isSyncingRef.current = true;
        startPolling(); // Seamlessly start polling without reload
      } else {
        toast.error(result.message || 'Failed to start sync');
      }
    } catch (err) {
      console.error("Manual sync error:", err);
      toast.error('Connection error');
    }
  };

  // Build display labels for linked accounts
  const getAccountLabels = () => {
    if (linkedAccounts.length === 0) {
      return syncedBookies.map(b => ({ label: b, bookie: b }));
    }

    const bookieCounts = {};
    linkedAccounts.forEach(acc => {
      bookieCounts[acc.bookie] = (bookieCounts[acc.bookie] || 0) + 1;
    });

    return linkedAccounts.map(acc => ({
      label: bookieCounts[acc.bookie] > 1 ? `${acc.bookie} (${acc.username})` : acc.bookie,
      bookie: acc.bookie,
      username: acc.username,
      syncError: acc.syncError
    }));
  };

  // --- FILTERED BETS ---
  const filteredBets = useMemo(() => {
    let bets = rawBets;
    if (selectedBookie !== 'all') {
      bets = bets.filter(b => b.Bookie === selectedBookie);
    }
    if (selectedTimePeriod !== 'all') {
      const period = TIME_PERIODS.find(p => p.key === selectedTimePeriod);
      if (period && period.days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - period.days);
        bets = bets.filter(b => {
          const betDate = new Date(b.Date);
          return betDate >= cutoff;
        });
      }
    }
    return bets;
  }, [rawBets, selectedBookie, selectedTimePeriod]);

  const bookieOptions = useMemo(() => {
    return [...new Set(rawBets.map(b => b.Bookie).filter(Boolean))];
  }, [rawBets]);

  const User = () => (
    <div className="User">
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <img id="UserPic" src={UserPic} alt="UserPic" />
        <div
          onClick={() => navigate("/")}
          style={{
            position: "absolute",
            bottom: "0",
            right: "0",
            width: "18px",
            height: "18px",
            backgroundColor: "#283038",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            cursor: "pointer"
          }}
        >
          <FaPlus style={{ fontSize: "10px", color: "#f1f1f1" }} />
        </div>
      </div>
      <div className="UserText">
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <span>What's Up, <span style={{ fontWeight: "600", textTransform: "capitalize" }} > {profile.nickname}</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.65rem', 
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              color: forceFullSync ? '#1976d2' : '#666',
              fontWeight: '600',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: forceFullSync ? 'rgba(25, 118, 210, 0.08)' : '#f5f5f5',
              border: forceFullSync ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid #ddd',
              transition: 'all 0.2s ease',
              opacity: isSyncing ? 0.6 : 1
            }}>
              <input
                type="checkbox"
                checked={forceFullSync}
                onChange={(e) => setForceFullSync(e.target.checked)}
                disabled={isSyncing}
                style={{ 
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  accentColor: '#1976d2',
                  margin: 0
                }}
              />
              Full History
            </label>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                fontSize: '0.7rem',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isSyncing ? '#f5f5f5' : '#1976d2',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                color: isSyncing ? '#aaa' : '#fff',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isSyncing ? 'none' : '0 2px 8px rgba(25, 118, 210, 0.2)',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={12} className={isSyncing ? 'spin' : ''} />
              {isSyncing ? 'SYNCING...' : 'SYNC'}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('bt_token');
                localStorage.removeItem('bt_userId');
                window.location.href = '/';
              }}
              style={{
                fontSize: '0.65rem',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                cursor: 'pointer',
                color: '#666',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              Logout
            </button>
          </span>
        </p>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          {getAccountLabels().map((item, idx) => (
            <Box
              key={`${item.bookie}-${item.username || idx}`}
              sx={{
                fontSize: '0.6rem',
                backgroundColor: '#f0f0f0',
                px: 1,
                py: 0.2,
                borderRadius: '4px',
                border: '1px solid #ddd',
                textTransform: 'capitalize',
                fontWeight: '600',
                color: '#666'
              }}
            >
              {item.label}
            </Box>
          ))}
          {isLoading && !isSyncing && (
            <Box sx={{ fontSize: '0.6rem', color: '#1976d2', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              Loading...
            </Box>
          )}
          {isSyncing && (
             <Box sx={{ fontSize: '0.6rem', color: '#2e7d32', fontWeight: '700', display: 'flex', alignItems: 'center', animation: 'pulse 2s infinite' }}>
               ● Live Syncing...
             </Box>
          )}
        </Box>
      </div>
    </div>
  );

  const FilterPill = ({ label, active, onClick }) => (
    <span
      className={`FilterPill ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </span>
  );

  return (
    <div id="Dashboard" style={{ position: 'relative', minHeight: '100vh', transition: 'opacity 0.3s' }}>
      <User />
      <Balance amount={profile.balance} />

      <div className="FilterContainer">
        {bookieOptions.length > 1 && (
          <div className="FilterSection">
            <FilterPill
              label="All Bookies"
              active={selectedBookie === 'all'}
              onClick={() => setSelectedBookie('all')}
            />
            {bookieOptions.map(b => (
              <FilterPill
                key={b}
                label={b}
                active={selectedBookie === b}
                onClick={() => setSelectedBookie(b)}
              />
            ))}
          </div>
        )}

        <div className="FilterSection">
          {TIME_PERIODS.map(p => (
            <FilterPill
              key={p.key}
              label={p.label}
              active={selectedTimePeriod === p.key}
              onClick={() => setSelectedTimePeriod(p.key)}
            />
          ))}
        </div>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', position: 'sticky', top: 0, zIndex: 1000 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="dashboard tabs"
          variant="fullWidth"
          sx={{
            '& .MuiTabs-flexContainer': {
              borderBottom: 'none'
            }
          }}
        >
          <Tab
            label="Overview"
            value={0}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              fontWeight: value === 0 ? '700' : '500',
              minWidth: 0,
              px: { xs: 1, sm: 2 }
            }}
          />
          <Tab
            label="Betting Behavior"
            value={1}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              fontWeight: value === 1 ? '700' : '500',
              minWidth: 0,
              px: { xs: 1, sm: 2 }
            }}
          />
          <Tab
            label="Psychology"
            value={2}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              fontWeight: value === 2 ? '700' : '500',
              minWidth: 0,
              px: { xs: 1, sm: 2 }
            }}
          />
        </Tabs>
      </Box>

      {(isLoading || isSyncing) ? (
        <DiceLoader />
      ) : (
        <>
          <TabPanel value={value} index={0}>
            {value === 0 && <OverviewTab bets={filteredBets} isSyncing={isSyncing} />}
          </TabPanel>
          <TabPanel value={value} index={1}>
            {value === 1 && <BettingBehaviorTab bets={filteredBets} isSyncing={isSyncing} />}
          </TabPanel>
          <TabPanel value={value} index={2}>
            {value === 2 && <PsychologyTab bets={filteredBets} isSyncing={isSyncing} />}
          </TabPanel>
        </>
      )}

    </div>
  );
};

export default Dashboard;