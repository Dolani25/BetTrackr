import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import UserPic from "/assets/i.jpeg";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import OverviewTab from './components/OverviewTab';
import BettingBehaviorTab from './components/BettingBehaviorTab';
import PsychologyTab from './components/PsychologyTab';
import DiceLoader from './components/DiceLoader';
import toast from 'react-hot-toast';
import { RotateCcw, LogOut, ChevronDown } from 'lucide-react';

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
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('1d'); // key from TIME_PERIODS
  const [profile, setProfile] = useState({ balance: 0, nickname: 'User' });
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [syncMenuAnchor, setSyncMenuAnchor] = useState(null);
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

  const handleManualSync = async (isFull = forceFullSync) => {
    if (isSyncing) return;
    
    try {
      const token = localStorage.getItem('bt_token');
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceFullSync: isFull })
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

  const getGroupedBookies = () => {
    if (linkedAccounts.length === 0) {
      return syncedBookies.map(b => ({ bookie: b, count: 1, usernames: [], syncError: false }));
    }

    const groups = {};
    linkedAccounts.forEach(acc => {
      if (!groups[acc.bookie]) {
        groups[acc.bookie] = { bookie: acc.bookie, count: 0, usernames: [], syncError: false };
      }
      groups[acc.bookie].count += 1;
      if (acc.username) {
        groups[acc.bookie].usernames.push(acc.username);
      }
      if (acc.syncError) {
        groups[acc.bookie].syncError = true;
      }
    });

    return Object.values(groups);
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

  const getBookieLogo = (bookie) => {
    const name = bookie.toLowerCase();
    if (name.includes('sporty')) return '/assets/sportybet.jpg';
    if (name.includes('msport')) return '/assets/Msport.png';
    if (name.includes('bet9ja')) return '/assets/bet9ja.jpeg';
    if (name.includes('1x')) return '/assets/1xbet.png';
    if (name.includes('betano')) return '/assets/betano.png';
    if (name.includes('betway')) return '/assets/betway.png';
    if (name.includes('betwinner')) return '/assets/betwinner.png';
    if (name.includes('pawa') || name.includes('pemia') || name.includes('premier')) return '/assets/pawa.jpg'; // Using pawa for premierbet/pemia as fallback based on available assets
    if (name.includes('22bet')) return '/assets/22bet.jpeg';
    if (name.includes('bet365')) return '/assets/bet365.png';
    if (name.includes('bcgame')) return '/assets/bcgame.png';
    if (name.includes('parimatch')) return '/assets/parimatch.jpeg';
    if (name.includes('paripesa')) return '/assets/paripesa (2).jpeg';
    if (name.includes('melbet')) return '/assets/melbet.png';
    if (name.includes('nairabet')) return '/assets/nairabet.png';
    if (name.includes('stake')) return '/assets/stake.jpg';
    if (name.includes('wazobet')) return '/assets/wazobet.png';
    if (name.includes('football')) return '/assets/football.png';
    return `/assets/${name}.png`;
  };

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
      <div className="UserText" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="greeting-fade-vertical" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>What's Up, </span>
            <span style={{ fontWeight: "700", fontSize: '1.3rem', textTransform: "capitalize", color: '#0f172a' }}>{profile.nickname}</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'stretch',
                borderRadius: '6px',
                border: '1px solid #1976d2',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)'
              }}>
                <button
                  onClick={() => handleManualSync(false)}
                  disabled={isSyncing}
                  style={{
                    fontSize: '0.7rem',
                    padding: '6px 12px',
                    border: 'none',
                    backgroundColor: isSyncing ? '#e0e0e0' : '#1976d2',
                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                    color: isSyncing ? '#888' : '#fff',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    borderRight: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <RotateCcw size={12} className={isSyncing ? 'spin' : ''} />
                  {isSyncing ? 'SYNCING' : 'SYNC'}
                </button>
                <button
                  onClick={() => setSyncMenuAnchor(!syncMenuAnchor)}
                  disabled={isSyncing}
                  style={{
                    padding: '6px 6px',
                    border: 'none',
                    backgroundColor: isSyncing ? '#e0e0e0' : '#1976d2',
                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                    color: isSyncing ? '#888' : '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronDown size={14} style={{ transform: syncMenuAnchor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>
              </div>

              {/* Sleek Custom Dropdown */}
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '160px',
                padding: '6px',
                zIndex: 50,
                opacity: syncMenuAnchor ? 1 : 0,
                visibility: syncMenuAnchor ? 'visible' : 'hidden',
                transform: syncMenuAnchor ? 'translateY(0)' : 'translateY(-10px)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: syncMenuAnchor ? 'auto' : 'none'
              }}>
                <button
                  onClick={() => { setSyncMenuAnchor(false); handleManualSync(true); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Full History Sync
                </button>
              </div>
            </div>
            

            <button
              onClick={() => {
                localStorage.removeItem('bt_token');
                localStorage.removeItem('bt_userId');
                window.location.href = '/';
              }}
              title="Logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                cursor: 'pointer',
                color: '#d32f2f',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={14} />
            </button>
          </span>
        </div>

        <div className="SyncHealthContainer">
          <div className="SyncHealthText">
            <span style={{ fontWeight: '800', color: '#111' }}>Sync Account:</span><br/>
            <span style={{ color: '#333', fontWeight: '500' }}>
              {linkedAccounts.some(a => a.syncError) ? 'Partially Connected' : 'Connected'} ({getAccountLabels().length})
            </span>
          </div>
          <div className="SyncHealthDivider"></div>
          <div className="SyncHealthLogosContainer">
            {getGroupedBookies().map((group, idx) => (
              <div 
                className="SyncBookieWrapper" 
                key={`${group.bookie}-${idx}`}
                onClick={() => setActiveTooltip(activeTooltip === group.bookie ? null : group.bookie)}
                title={group.usernames.length > 0 ? group.usernames.join(', ') : group.bookie}
              >
                <img 
                  src={getBookieLogo(group.bookie)} 
                  alt={group.bookie}
                  style={{ width: '27px', height: '27px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="SyncBookieFallback"
                  style={{ display: 'none', width: '27px', height: '27px', borderRadius: '6px', backgroundColor: '#555', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {group.bookie.substring(0, 1).toUpperCase()}
                </div>
                {group.count > 1 && (
                  <div className="SyncBookieBadge">
                    {group.count}
                  </div>
                )}
                {activeTooltip === group.bookie && (
                  <div className="SyncBookieTooltip">
                    {group.usernames.length > 0 ? (
                      group.usernames.map((u, i) => <div key={i} style={{ padding: '2px 0' }}>{u}</div>)
                    ) : (
                      <div style={{ padding: '2px 0', textTransform: 'capitalize' }}>{group.bookie}</div>
                    )}
                  </div>
                )}
                <div className="SyncCheckmarkIcon">
                  {group.syncError ? (
                     <svg viewBox="0 0 24 24" fill="#d32f2f" width="12px" height="12px" style={{ backgroundColor: 'white', borderRadius: '50%' }}>
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                     </svg>
                  ) : (
                     <svg viewBox="0 0 24 24" fill="#4caf50" width="12px" height="12px" style={{ backgroundColor: 'white', borderRadius: '50%' }}>
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                     </svg>
                  )}
                </div>
              </div>
            ))}
            {isLoading && !isSyncing && (
              <span style={{ fontSize: '0.8rem', color: '#1976d2', fontWeight: '600', marginLeft: '4px' }}>
                Loading...
              </span>
            )}
            {isSyncing && (
               <span style={{ fontSize: '0.8rem', color: '#2e7d32', fontWeight: '700', animation: 'pulse 2s infinite', marginLeft: '4px' }}>
                 ● Syncing...
               </span>
            )}
          </div>
        </div>
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

        <div 
          className="TimeframeFilterContainer"
          style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            gap: '2px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none' // IE/Edge
          }}
        >
          {TIME_PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedTimePeriod(p.key)}
              style={{
                border: 'none',
                background: selectedTimePeriod === p.key ? '#ffffff' : 'transparent',
                color: selectedTimePeriod === p.key ? '#0f172a' : '#64748b',
                fontWeight: selectedTimePeriod === p.key ? '700' : '600',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: selectedTimePeriod === p.key ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
            >
              {p.label}
            </button>
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