import React, { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import { 
  User, Wallet, Shield, Trophy, Link2, History, ChevronRight, 
  ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle, RefreshCw,
  Bell
} from 'lucide-react';
import HostPanel from './HostPanel';
import NotificationsView from './NotificationsView';

export default function MeView({ initialPanel = 'menu', setActivePanel: setParentActivePanel }) {
  const { 
    user, registrations, transactions, switchUserRole, 
    linkGameIdentity, depositFunds, withdrawFunds, resetDatabase, logoutUser,
    fetchLeaderboard, notifications
  } = useDB();

  const [activePanel, setActivePanelState] = useState(initialPanel);
  
  useEffect(() => {
    setActivePanelState(initialPanel);
  }, [initialPanel]);

  const setActivePanel = (panel) => {
    setActivePanelState(panel);
    if (setParentActivePanel) {
      setParentActivePanel(panel);
    }
  };

  const unreadCount = notifications ? notifications.filter(n => !n.isRead).length : 0;
  
  // States for Wallet actions
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  
  // States for Link ID actions
  const [bgmiCharId, setBgmiCharId] = useState(user.identities.bgmi?.characterId || '');
  const [bgmiName, setBgmiName] = useState(user.identities.bgmi?.inGameName || '');
  const [ffCharId, setFfCharId] = useState(user.identities.freefire?.characterId || '');
  const [ffName, setFfName] = useState(user.identities.freefire?.inGameName || '');

  const [walletErrors, setWalletErrors] = useState({});
  const [linkErrors, setLinkErrors] = useState({});

  const [linking, setLinking] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Real Leaderboard states
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (activePanel === 'leaderboard') {
      const loadLeaderboard = async () => {
        setLoadingLeaderboard(true);
        const data = await fetchLeaderboard();
        setLeaderboard(data);
        setLoadingLeaderboard(false);
      };
      loadLeaderboard();
    }
  }, [activePanel]);

  // Calculate stats
  const userRegs = registrations.filter(r => r.userId === user.id);
  const totalMatches = userRegs.length;
  
  const totalKills = userRegs.reduce((acc, curr) => {
    return acc + (curr.matchStats.kills || 0) + (curr.matchStats.cumulativeKills || 0);
  }, 0);

  const getCoinBalance = () => {
    return user.wallet.deposit + user.wallet.winnings;
  };

  // Handlers
  const handleLinkIdsSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    const hasBgmiInput = bgmiCharId.trim() || bgmiName.trim();
    const hasFfInput = ffCharId.trim() || ffName.trim();

    if (!hasBgmiInput && !hasFfInput) {
      alert('Please fill out character details for at least one game (BGMI or Free Fire).');
      return;
    }

    if (hasBgmiInput) {
      if (!bgmiCharId.trim()) errs.bgmiId = 'BGMI character ID is required';
      if (!bgmiName.trim()) errs.bgmiName = 'BGMI in-game name is required';
    }

    if (hasFfInput) {
      if (!ffCharId.trim()) errs.ffId = 'Free Fire character ID is required';
      if (!ffName.trim()) errs.ffName = 'Free Fire in-game name is required';
    }

    if (Object.keys(errs).length > 0) {
      setLinkErrors(errs);
      return;
    }
    setLinkErrors({});
    setLinking(true);
    try {
      if (hasBgmiInput) {
        await linkGameIdentity('bgmi', bgmiCharId, bgmiName);
      }
      if (hasFfInput) {
        await linkGameIdentity('freefire', ffCharId, ffName);
      }
      alert('Character IDs updated successfully!');
      setActivePanel('menu');
    } catch (error) {
      alert('Failed to link character IDs.');
    } finally {
      setLinking(false);
    }
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const amt = parseFloat(depositAmount);

    if (!depositAmount || !depositAmount.toString().trim()) {
      errs.deposit = 'Please select a deposit amount';
    } else if (isNaN(amt) || ![20, 30, 50, 100, 200, 300, 400, 500, 1000].includes(amt)) {
      errs.deposit = 'Only fixed deposit amounts of ₹20, ₹30, ₹50, ₹100, ₹200, ₹300, ₹400, ₹500, or ₹1000 are allowed';
    }

    if (Object.keys(errs).length > 0) {
      setWalletErrors(errs);
      return;
    }
    setWalletErrors({});
    setDepositing(true);
    try {
      const success = await depositFunds(depositAmount);
      if (success) {
        setDepositAmount('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const amt = parseFloat(withdrawAmount);
    
    if (!withdrawAmount || !withdrawAmount.toString().trim()) {
      errs.withdraw = 'Please select a withdrawal amount';
    } else if (isNaN(amt) || ![50, 100, 200, 300, 400, 500].includes(amt)) {
      errs.withdraw = 'Only fixed withdrawal amounts of ₹50, ₹100, ₹200, ₹300, ₹400, or ₹500 are allowed';
    } else if (amt > user.wallet.winnings) {
      errs.withdraw = `Insufficient Winnings Balance! Limit: ₹${user.wallet.winnings}`;
    }

    if (!upiId.trim()) {
      errs.upi = 'UPI ID is required';
    } else if (!upiId.includes('@')) {
      errs.upi = 'Please enter a valid UPI ID (e.g. name@paytm)';
    }

    if (Object.keys(errs).length > 0) {
      setWalletErrors(errs);
      return;
    }
    setWalletErrors({});

    // Check if user has already withdrawn in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWithdrawal = transactions.find(
      tx => tx.type === 'Withdrawal' && new Date(tx.timestamp) >= twentyFourHoursAgo
    );

    if (recentWithdrawal) {
      alert('Only 1 withdrawal is allowed in a 24-hour period. Please try again later.');
      return;
    }

    setWithdrawing(true);
    try {
      const success = await withdrawFunds(withdrawAmount, upiId);
      if (success) {
        setWithdrawAmount('');
        setUpiId('');
      }
    } catch (error) {
      alert('Failed to withdraw funds.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Sub-Panels rendering
  if (activePanel === 'host-panel') {
    return <HostPanel onBack={() => setActivePanel('menu')} />;
  }

  return (
    <div className="me-view-container">
      
      {/* 1. Header Navigation Wrapper for inner pages */}
      {activePanel !== 'menu' && (
        <div className="inner-panel-header">
          <button className="back-arrow-btn" onClick={() => setActivePanel('menu')}>
            <ArrowLeft size={20} />
          </button>
          <h4>
            {activePanel === 'wallet' && 'My Wallet'}
            {activePanel === 'link-ids' && 'Link Character IDs'}
            {activePanel === 'leaderboard' && 'SkyArena Leaders'}
            {activePanel === 'notifications' && 'Notifications'}
          </h4>
          <div style={{ width: 20 }}></div>
        </div>
      )}

      {/* Main Panel views */}
      {activePanel === 'menu' && (
        <>
          {/* Profile Card component */}
          <div className="profile-hero-card">
            <div className="profile-avatar-large">
              {user.avatar}
            </div>
            <div className="profile-details">
              <h3 className="profile-username highlight-gold">{user.fullName}</h3>
              <span className="profile-sub">{user.phoneNumber || user.email}</span>
              <span className="profile-badge-pill">
                {user.isOrganizer ? 'SkyArena Organizer' : 'Challenger Pro'}
              </span>
            </div>
          </div>

          {/* Core User Stats columns */}
          <div className="profile-stats-grid">
            <div className="stat-column">
              <span className="stat-val">{totalMatches}</span>
              <span className="stat-lbl">Matches</span>
            </div>
            <div className="stat-column border-x">
              <span className="stat-val">{totalKills}</span>
              <span className="stat-lbl">Total Kills</span>
            </div>
            <div className="stat-column">
              <span className="stat-val highlight-gold">₹{user.wallet.winnings.toFixed(0)}</span>
              <span className="stat-lbl">Winnings</span>
            </div>
          </div>

          {/* Action List menu */}
          <div className="profile-action-menu">
            
            <button className="menu-item" onClick={() => setActivePanel('notifications')}>
              <div className="menu-item-left">
                <div className="menu-icon-box blue" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                  <Bell size={18} />
                </div>
                <div className="menu-text">
                  <h5>Notifications</h5>
                  <span>View match rooms, credits, and results</span>
                </div>
              </div>
              {unreadCount > 0 && <span className="menu-badge-pulse">{unreadCount}</span>}
              <ChevronRight size={16} className="chevron" />
            </button>

            <button className="menu-item" onClick={() => setActivePanel('wallet')}>
              <div className="menu-item-left">
                <div className="menu-icon-box blue">
                  <Wallet size={18} />
                </div>
                <div className="menu-text">
                  <h5>My Wallet</h5>
                  <span>Deposit funds & Withdraw cash winnings</span>
                </div>
              </div>
              <ChevronRight size={16} className="chevron" />
            </button>

            <button className="menu-item" onClick={() => setActivePanel('link-ids')}>
              <div className="menu-item-left">
                <div className="menu-icon-box gold">
                  <Link2 size={18} />
                </div>
                <div className="menu-text">
                  <h5>Link Character IDs</h5>
                  <span>Sync BGMI and Free Fire game IDs</span>
                </div>
              </div>
              <ChevronRight size={16} className="chevron" />
            </button>

            <button className="menu-item" onClick={() => setActivePanel('host-panel')}>
              <div className="menu-item-left">
                <div className="menu-icon-box emerald">
                  <Shield size={18} />
                </div>
                <div className="menu-text">
                  <h5>Organizer Dashboard</h5>
                  <span>Create lobbies and manual payout ledgers</span>
                </div>
              </div>
              <ChevronRight size={16} className="chevron" />
            </button>

            <button className="menu-item" onClick={() => setActivePanel('leaderboard')}>
              <div className="menu-item-left">
                <div className="menu-icon-box purple">
                  <Trophy size={18} />
                </div>
                <div className="menu-text">
                  <h5>Leaderboard</h5>
                  <span>Top payout earners this season</span>
                </div>
              </div>
              <ChevronRight size={16} className="chevron" />
            </button>

            <button className="menu-item" onClick={() => logoutUser()}>
              <div className="menu-item-left">
                <div className="menu-icon-box" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                  <AlertCircle size={18} />
                </div>
                <div className="menu-text">
                  <h5 style={{ color: '#f87171' }}>Log Out</h5>
                  <span>Sign out of your account</span>
                </div>
              </div>
              <ChevronRight size={16} className="chevron" />
            </button>
          </div>


        </>
      )}

      {/* Wallet Panel */}
      {activePanel === 'wallet' && (
        <div className="wallet-sub-panel">
          
          {/* Balance Cards Display */}
          <div className="wallet-balances-card">
            <div className="balance-item">
              <span className="balance-label">DEPOSIT CASH</span>
              <h3 className="balance-value">₹{user.wallet.deposit.toFixed(0)}</h3>
              <span className="balance-desc">For entry fees only</span>
            </div>
            <div className="balance-divider"></div>
            <div className="balance-item">
              <span className="balance-label highlight-gold">WINNINGS CASH</span>
              <h3 className="balance-value highlight-gold">₹{user.wallet.winnings.toFixed(0)}</h3>
              <span className="balance-desc">Withdrawable directly</span>
            </div>
          </div>

          {/* Quick Actions Forms */}
          <div className="wallet-actions-container">
            
            {/* 1. Add Funds Form */}
            <form className="wallet-action-form" noValidate onSubmit={handleDepositSubmit}>
              <h5>Add Funds via UPI</h5>
              <div className="form-input-row vertical" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>Choose Deposit Amount (₹)</label>
                  <div className="fixed-amounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[20, 30, 50, 100, 200, 300, 400, 500, 1000].map((amount) => {
                      const isSelected = parseFloat(depositAmount) === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          className={`fixed-amount-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setDepositAmount(amount.toString());
                            if (walletErrors.deposit) {
                              setWalletErrors(prev => ({ ...prev, deposit: null }));
                            }
                          }}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            border: isSelected 
                              ? '2px solid var(--color-primary)' 
                              : '1px solid var(--color-border)',
                            backgroundColor: isSelected 
                              ? 'rgba(14, 165, 233, 0.1)' 
                              : '#071120',
                            color: isSelected 
                              ? 'var(--color-primary)' 
                              : 'white',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          ₹{amount}
                        </button>
                      );
                    })}
                  </div>
                  {walletErrors.deposit && <span className="custom-input-error" style={{ marginTop: '4px' }}>{walletErrors.deposit}</span>}
                </div>
                <button type="submit" className="action-submit-btn deposit" disabled={depositing} style={{ width: '100%' }}>
                  {depositing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="spin-animate" /> Adding Cash...
                    </span>
                  ) : (
                    'Add Cash'
                  )}
                </button>
              </div>
            </form>

            {/* 2. Withdraw Winnings Form */}
            <form className="wallet-action-form" noValidate onSubmit={handleWithdrawSubmit}>
              <h5>Instant Withdrawal to UPI ID</h5>
              <div className="form-input-row vertical" style={{ gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>Choose Withdrawal Amount (₹)</label>
                  <div className="fixed-amounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[50, 100, 200, 300, 400, 500].map((amount) => {
                      const isSelected = parseFloat(withdrawAmount) === amount;
                      const isInsufficient = amount > user.wallet.winnings;
                      return (
                        <button
                          key={amount}
                          type="button"
                          disabled={isInsufficient}
                          className={`fixed-amount-btn ${isSelected ? 'selected' : ''} ${isInsufficient ? 'insufficient' : ''}`}
                          onClick={() => {
                            setWithdrawAmount(amount.toString());
                            if (walletErrors.withdraw) {
                              setWalletErrors(prev => ({ ...prev, withdraw: null }));
                            }
                          }}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '8px',
                            border: isSelected 
                              ? '2px solid var(--color-primary)' 
                              : '1px solid var(--color-border)',
                            backgroundColor: isSelected 
                              ? 'rgba(14, 165, 233, 0.1)' 
                              : isInsufficient 
                                ? '#030a16' 
                                : '#071120',
                            color: isSelected 
                              ? 'var(--color-primary)' 
                              : isInsufficient 
                                ? 'rgba(148, 163, 184, 0.3)' 
                                : 'white',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: isInsufficient ? 'not-allowed' : 'pointer',
                            opacity: isInsufficient ? 0.5 : 1,
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          ₹{amount}
                        </button>
                      );
                    })}
                  </div>
                  {walletErrors.withdraw && <span className="custom-input-error" style={{ marginTop: '4px' }}>{walletErrors.withdraw}</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder="UPI ID (e.g. player@okaxis)" 
                    value={upiId}
                    onChange={(e) => { setUpiId(e.target.value); if (walletErrors.upi) setWalletErrors(prev => ({ ...prev, upi: null })); }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: walletErrors.upi ? '1px solid #ef4444' : '1px solid var(--color-border)', backgroundColor: '#071120', color: 'white', fontSize: '0.85rem' }}
                  />
                  {walletErrors.upi && <span className="custom-input-error">{walletErrors.upi}</span>}
                </div>
                
                <button type="submit" className="action-submit-btn withdraw" disabled={withdrawing}>
                  {withdrawing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="spin-animate" /> Withdrawing...
                    </span>
                  ) : (
                    'Withdraw Funds'
                  )}
                </button>
              </div>
            </form>

          </div>

          {/* Transaction Ledger Log */}
          <div className="transaction-history-panel">
            <h4 className="section-label">Transaction Logs</h4>
            <div className="tx-list">
              {transactions.length === 0 ? (
                <p className="no-tx-text">No transactions yet.</p>
              ) : (
                transactions.map((tx) => (
                  <div className="tx-card" key={tx.transactionId}>
                    <div className="tx-left">
                      <div className={`tx-icon ${tx.type.toLowerCase()}`}>
                        {(tx.type === 'Deposit' || tx.type === 'Refund' || tx.type === 'SpinWheelReward') && <Plus size={16} />}
                        {tx.type === 'Withdrawal' && <ArrowDownLeft size={16} />}
                        {tx.type === 'Winnings' && <ArrowUpRight size={16} />}
                        {tx.type === 'OrganizerCommission' && <Trophy size={16} />}
                        {tx.type === 'EntryFee' && <ArrowDownLeft size={16} />}
                      </div>
                      <div className="tx-info">
                        <h5>{tx.type === 'EntryFee' ? 'Joined Match Fee' : tx.type === 'OrganizerCommission' ? 'Host Commission Fee' : tx.type === 'Refund' ? 'Tournament Refund' : tx.type === 'SpinWheelReward' ? 'Spin Wheel Reward' : tx.type}</h5>
                        <span>UPI Ref: {tx.upiRef}</span>
                        <span className="tx-time">{new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${tx.type === 'Deposit' || tx.type === 'Winnings' || tx.type === 'OrganizerCommission' || tx.type === 'Refund' || tx.type === 'SpinWheelReward' ? 'positive' : 'negative'}`}>
                        {tx.type === 'Deposit' || tx.type === 'Winnings' || tx.type === 'OrganizerCommission' || tx.type === 'Refund' || tx.type === 'SpinWheelReward' ? '+' : '-'}₹{tx.amount.toFixed(0)}
                      </span>
                      <span className="tx-status success">{tx.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Link Character IDs Panel */}
      {activePanel === 'link-ids' && (
        <form className="link-ids-panel" noValidate onSubmit={handleLinkIdsSubmit}>
          <div className="link-info-banner">
            <AlertCircle size={20} className="highlight-gold" style={{ flexShrink: 0 }} />
            <p>You must link your correct in-game character IDs to register for tournament rooms. Payout checks match standings scores with these IDs.</p>
          </div>

          <div className="game-link-block">
            <h5 className="game-label bgmi">Battlegrounds Mobile India</h5>
            <div className="input-group">
              <label>BGMI Character ID (Numeric)</label>
              <input 
                type="text" 
                placeholder="e.g. 590431289" 
                value={bgmiCharId}
                onChange={(e) => { setBgmiCharId(e.target.value); if (linkErrors.bgmiId) setLinkErrors(prev => ({ ...prev, bgmiId: null })); }}
                style={{ border: linkErrors.bgmiId ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
              />
              {linkErrors.bgmiId && <span className="custom-input-error">{linkErrors.bgmiId}</span>}
            </div>
            <div className="input-group">
              <label>BGMI In-Game Name (IGN)</label>
              <input 
                type="text" 
                placeholder="e.g. RakeshPlayz" 
                value={bgmiName}
                onChange={(e) => { setBgmiName(e.target.value); if (linkErrors.bgmiName) setLinkErrors(prev => ({ ...prev, bgmiName: null })); }}
                style={{ border: linkErrors.bgmiName ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
              />
              {linkErrors.bgmiName && <span className="custom-input-error">{linkErrors.bgmiName}</span>}
            </div>
          </div>

          <div className="game-link-block">
            <h5 className="game-label freefire">Free Fire Max</h5>
            <div className="input-group">
              <label>Free Fire Character ID (Numeric)</label>
              <input 
                type="text" 
                placeholder="e.g. 98124098" 
                value={ffCharId}
                onChange={(e) => { setFfCharId(e.target.value); if (linkErrors.ffId) setLinkErrors(prev => ({ ...prev, ffId: null })); }}
                style={{ border: linkErrors.ffId ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
              />
              {linkErrors.ffId && <span className="custom-input-error">{linkErrors.ffId}</span>}
            </div>
            <div className="input-group">
              <label>Free Fire In-Game Name (IGN)</label>
              <input 
                type="text" 
                placeholder="e.g. HackerFF" 
                value={ffName}
                onChange={(e) => { setFfName(e.target.value); if (linkErrors.ffName) setLinkErrors(prev => ({ ...prev, ffName: null })); }}
                style={{ border: linkErrors.ffName ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
              />
              {linkErrors.ffName && <span className="custom-input-error">{linkErrors.ffName}</span>}
            </div>
          </div>

          <button type="submit" className="save-link-ids-btn" disabled={linking}>
            {linking ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="spin-animate" /> Saving...
              </span>
            ) : (
              'Save Identities'
            )}
          </button>
        </form>
      )}

      {/* Leaderboard Panel */}
      {activePanel === 'leaderboard' && (
        <div className="leaderboard-panel">
          {loadingLeaderboard ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
              <RefreshCw className="spin-animate highlight-gold" size={24} style={{ margin: '0 auto 10px' }} />
              <p>Loading leaderboard standings...</p>
            </div>
          ) : (
            <>
              <div className="leaderboard-top-three">
                {/* Rank 2 (Podium Left) */}
                {leaderboard[1] ? (
                  <div className="podium-spot rank-2">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar">{leaderboard[1].avatar || leaderboard[1].fullName.charAt(0).toUpperCase()}</span>
                      <span className="podium-rank-badge">2</span>
                    </div>
                    <h5>{leaderboard[1].fullName}</h5>
                    <span className="podium-winnings">₹{(leaderboard[1].wallet.totalWinnings || 0).toFixed(0)}</span>
                  </div>
                ) : (
                  <div className="podium-spot rank-2 empty">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar">-</span>
                      <span className="podium-rank-badge">2</span>
                    </div>
                    <h5>TBD</h5>
                    <span className="podium-winnings">₹0</span>
                  </div>
                )}

                {/* Rank 1 (Podium Center) */}
                {leaderboard[0] ? (
                  <div className="podium-spot rank-1">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar highlight-gold-border">{leaderboard[0].avatar || leaderboard[0].fullName.charAt(0).toUpperCase()}</span>
                      <Trophy size={16} className="crown-icon highlight-gold" />
                      <span className="podium-rank-badge gold">1</span>
                    </div>
                    <h5>{leaderboard[0].fullName}</h5>
                    <span className="podium-winnings">₹{(leaderboard[0].wallet.totalWinnings || 0).toFixed(0)}</span>
                  </div>
                ) : (
                  <div className="podium-spot rank-1 empty">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar highlight-gold-border">-</span>
                      <Trophy size={16} className="crown-icon highlight-gold" />
                      <span className="podium-rank-badge gold">1</span>
                    </div>
                    <h5>TBD</h5>
                    <span className="podium-winnings">₹0</span>
                  </div>
                )}

                {/* Rank 3 (Podium Right) */}
                {leaderboard[2] ? (
                  <div className="podium-spot rank-3">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar">{leaderboard[2].avatar || leaderboard[2].fullName.charAt(0).toUpperCase()}</span>
                      <span className="podium-rank-badge">3</span>
                    </div>
                    <h5>{leaderboard[2].fullName}</h5>
                    <span className="podium-winnings">₹{(leaderboard[2].wallet.totalWinnings || 0).toFixed(0)}</span>
                  </div>
                ) : (
                  <div className="podium-spot rank-3 empty">
                    <div className="podium-avatar-wrapper">
                      <span className="podium-avatar">-</span>
                      <span className="podium-rank-badge">3</span>
                    </div>
                    <h5>TBD</h5>
                    <span className="podium-winnings">₹0</span>
                  </div>
                )}
              </div>

              <div className="leaderboard-rows-list">
                <div className="leaderboard-header-row">
                  <span>RANK</span>
                  <span>PLAYER</span>
                  <span>WINNINGS</span>
                </div>
                
                {leaderboard.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                    No leaders yet. Play matches to earn winnings!
                  </div>
                ) : (
                  leaderboard.map((item, index) => {
                    const isMe = item._id === user.id;
                    return (
                      <div key={item._id || index} className={`leaderboard-row ${isMe ? 'highlight-user' : ''}`}>
                        <span>#{index + 1}</span>
                        <div className="row-player-info">
                          <span className="row-avatar">{item.avatar || item.fullName.charAt(0).toUpperCase()}</span>
                          <strong>{item.fullName} {isMe ? '(You)' : ''}</strong>
                        </div>
                        <span className="row-earnings">₹{(item.wallet.totalWinnings || 0).toFixed(0)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Notifications Panel */}
      {activePanel === 'notifications' && (
        <NotificationsView />
      )}

    </div>
  );
}
