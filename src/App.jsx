import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { DBProvider, useDB } from './context/DBContext';
import PlayView from './views/PlayView';
import EarnView from './views/EarnView';
import MeView from './views/MeView';
import MyMatchesView from './views/MyMatchesView';
import GameLobbyView from './views/GameLobbyView';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import { Bell, Coins, Gamepad2, Award, User, Wifi, Battery, Signal, ArrowLeft, RefreshCw, Zap, ShieldAlert } from 'lucide-react';
function AnimatedBalance({ balance }) {
  const [displayVal, setDisplayVal] = useState(balance);
  useEffect(() => {
    if (displayVal === balance) return;
    
    let start = displayVal;
    const end = balance;
    const duration = 800; // 800ms animation
    const startTime = performance.now();
    
    let frameId;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out quadratic
      const easeProgress = progress * (2 - progress);
      
      const current = Math.floor(start + easeProgress * (end - start));
      setDisplayVal(current);
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayVal(end);
      }
    };
    
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [balance]);
  return <span>{displayVal}</span>;
}
function GlobalSpinOverlay({ onClose }) {
  const { user, addSpinWinnings } = useDB();
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [coinsToAnimate, setCoinsToAnimate] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [spinWinnings, setSpinWinnings] = useState(0);
  const spinsAvailable = user?.wallet?.spinsAvailable || 0;
  const handleSpinWheel = () => {
    if (spinning || spinsAvailable <= 0) return;
    setSpinning(true);
    setShowCelebration(false);
    setCoinsToAnimate([]);
    // Select random prize based on distribution (Biased towards lower rewards)
    const prizes = [5, 10, 15, 25, 0, 50, 2, 20];
    const winChance = [0.20, 0.10, 0.03, 0.01, 0.25, 0.002, 0.40, 0.008]; // Distribution
    
    let r = Math.random();
    let selectedPrizeIdx = 0;
    let cumulative = 0;
    
    for (let i = 0; i < prizes.length; i++) {
      cumulative += winChance[i];
      if (r <= cumulative) {
        selectedPrizeIdx = i;
        break;
      }
    }
    const selectedPrize = prizes[selectedPrizeIdx];
    
    // Calculate clockwise rotation
    const extraSpins = 6;
    const sectorAngle = selectedPrizeIdx * 45 + 22.5;
    const nextRotation = wheelRotation + (extraSpins * 360) - (wheelRotation % 360) + (360 - sectorAngle);
    
    setWheelRotation(nextRotation);
    // Simulated wheel spin duration (4 seconds for transition)
    setTimeout(() => {
      setSpinning(false);
      setSpinWinnings(selectedPrize);
      setShowCelebration(true);
      // Register the spin with the backend to decrement available spins count
      addSpinWinnings(selectedPrize);
      if (selectedPrize > 0) {
        // Trigger coin burst animation
        const coinCount = 10;
        const newCoins = Array.from({ length: coinCount }, (_, idx) => idx + 1);
        setCoinsToAnimate(newCoins);
      }
    }, 4000);
  };
  return (
    <div className="spin-overlay-container">
      {/* Header bar */}
      <div className="lobby-header-bar curved-yellow-header">
        <button className="back-arrow-btn dark-icon" onClick={() => {
          if (spinning) return;
          onClose();
        }}>
          <ArrowLeft size={20} />
        </button>
        <div className="lobby-header-title dark-title">
          <h3>Lucky Draw Spin</h3>
        </div>
        <div className="header-pill-wallet" style={{ backgroundColor: '#0f1e35', borderColor: '#1e293b', padding: '4px 8px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontSize: '0.75rem', fontWeight: 'bold' }}>
          <Coins size={14} className="coin-gold-glow" />
          <AnimatedBalance balance={user.wallet.deposit + user.wallet.winnings} />
        </div>
      </div>
      <div className="spin-overlay-body">
        {/* Decorative text */}
        <div className="spin-promo-header">
          <h2>LUCKY WHEEL</h2>
          <p>Spin the wheel and claim your daily cash reward!</p>
          <div className="spins-available-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            color: 'var(--color-primary)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginTop: '8px'
          }}>
            Spins Left: {spinsAvailable}
          </div>
        </div>
        {/* Large Wheel graphic */}
        <div className="spin-wheel-area">
          {/* The Pointer */}
          <div className="wheel-pointer"></div>
          
          {/* The Spinner Circle Bezel */}
          <div className="spinner-wheel-bezel">
            <div className="spinner-wheel-container">
              <div 
                className="spinner-wheel-large" 
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                {[
                  { prize: 5, label: "₹5" },
                  { prize: 10, label: "₹10" },
                  { prize: 15, label: "₹15" },
                  { prize: 25, label: "₹25" },
                  { prize: 0, label: "TRY" },
                  { prize: 50, label: "₹50" },
                  { prize: 2, label: "₹2" },
                  { prize: 20, label: "₹20" }
                ].map((sec, idx) => {
                  const labelRotation = idx * 45 + 22.5;
                  return (
                    <div 
                      key={idx} 
                      className="wheel-label-large"
                      style={{ transform: `translate(-50%, -50%) rotate(${labelRotation}deg) translateY(-85px)` }}
                    >
                      {sec.label}
                    </div>
                  );
                })}
              </div>
              
              {/* Center Spinner Pin / Button */}
              <button 
                className={`wheel-center-pin ${spinning || spinsAvailable <= 0 ? 'disabled' : ''}`}
                onClick={handleSpinWheel}
                disabled={spinning || spinsAvailable <= 0}
                style={{
                  cursor: spinsAvailable <= 0 && !spinning ? 'not-allowed' : 'pointer',
                  opacity: spinsAvailable <= 0 && !spinning ? 0.75 : 1
                }}
              >
                {spinning ? 'SPINNING' : spinsAvailable <= 0 ? 'LOCKED' : 'SPIN'}
              </button>
            </div>
          </div>
        </div>
        {/* Winnings display / Celebration */}
        <div className="spin-status-display">
          {showCelebration && (
            <div className="spin-win-banner animated-scale-up">
              {spinWinnings > 0 ? (
                <>
                  <h3 className="highlight-gold text-burst">CONGRATULATIONS!</h3>
                  <p>You won <strong style={{ color: 'var(--color-success)', fontSize: '1.4rem' }}>₹{spinWinnings}</strong> cash!</p>
                  <span className="info-desc">Sending coins to your wallet...</span>
                </>
              ) : (
                <>
                  <h3 style={{ color: 'var(--color-text-muted)' }}>TRY AGAIN!</h3>
                  <p>Better luck on your next spin.</p>
                </>
              )}
            </div>
          )}
          
          {!spinning && !showCelebration && (
            <div className="spin-tap-prompt">
              <Zap size={14} className="coin-gold-glow" style={{ display: 'inline', marginRight: 4 }} />
              <span>
                {spinsAvailable > 0 
                  ? 'Tap SPIN to play! Cost: 1 Spin' 
                  : 'No spins left! Refer a friend to get 3 free spins.'}
              </span>
            </div>
          )}
          {spinning && (
            <div className="spin-waiting-text">
              <RefreshCw size={16} className="spin-animate highlight-gold" style={{ display: 'inline', marginRight: 6 }} />
              <span>Spinning... Best of luck!</span>
            </div>
          )}
        </div>
      </div>
      {/* Flying coins burst */}
      {coinsToAnimate.map((id) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 50;
        const rx = `${Math.cos(angle) * distance}px`;
        const ry = `${Math.sin(angle) * distance}px`;
        return (
          <div 
            key={id}
            className="flying-coin"
            style={{
              '--coin-random-x': rx,
              '--coin-random-y': ry,
              animationDelay: `${id * 80}ms`
            }}
          />
        );
      })}
    </div>
  );
}
function GameLobbyWrapper() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  return (
    <GameLobbyView 
      selectedGame={gameId} 
      setView={(v) => navigate(v === 'play' ? '/play' : `/${v}`)} 
    />
  );
}
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, showSpinOverlay, setShowSpinOverlay, notifications } = useDB();
  const [currentTime, setCurrentTime] = useState('');
  const [customAlert, setCustomAlert] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const unreadNotifCount = notifications ? notifications.filter(n => !n.isRead).length : 0;
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      setCustomAlert({ message: msg });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);
  // Intercept referral links on load to route directly to registration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('ref')) {
      navigate('/register');
    }
  }, []);
  // Listen for browser PWA installation trigger
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only prompt if they haven't dismissed it in this session
      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setShowInstallPopup(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User install prompt choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallPopup(false);
  };
  // Live clock for high-fidelity status bar
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);
  // Quick helper to fetch coin balance (deposit + winnings)
  const getCoinBalance = () => {
    return user ? user.wallet.deposit + user.wallet.winnings : 0;
  };
  const isActive = (path) => location.pathname.startsWith(path);
  const searchParams = new URLSearchParams(location.search);
  const panel = searchParams.get('panel') || 'menu';
  return (
    <div className="app-viewport-mockup-wrapper">
      {/* 3D-Style Phone Device Mockup Frame (desktop-only border wrapper) */}
      <div className="phone-device-bezel">
        <div className="phone-camera-island"></div>
        
        {/* Mock Physical Side Buttons */}
        <div className="phone-button-mock volume-up"></div>
        <div className="phone-button-mock volume-down"></div>
        <div className="phone-button-mock power"></div>
        
        <div className="phone-screen-frame">
          
          {/* Main App Container */}
          <div className="app-mobile-shell">
            
            {/* Phone Status Bar Mockup */}
            <div className="phone-mockup-status-bar">
              <div className="status-bar-left">
                <span>{currentTime || '12:00'}</span>
              </div>
              <div className="status-bar-right">
                <Signal size={12} style={{ transform: 'rotate(0deg)' }} />
                <Wifi size={12} />
                <Battery size={14} />
              </div>
            </div>
            {!user ? (
              <div className="app-mobile-main-content">
                <Routes>
                  <Route path="/login" element={<LoginView onSwitchView={() => navigate('/register')} />} />
                  <Route path="/register" element={<RegisterView onSwitchView={() => navigate('/login')} />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </div>
            ) : (
              <>
                {/* Header Component - Hidden on inner detail screens */}
                {!isActive('/lobbies') && !isActive('/my-matches') && (
                  <header className="app-mobile-header">
                    <div className="header-logo-section">
                      <div className="header-logo-circle">
                        <img src="/img/logo.png" alt="SkyArena Logo" className="header-logo-img" />
                      </div>
                      <div className="header-welcome-text">
                        <span>WELCOME BACK</span>
                        <h4>{user.fullName}</h4>
                      </div>
                    </div>
                    
                    <div className="header-action-pills">
                      <button className="header-pill-btn notification-bell-trigger" aria-label="Notifications" onClick={() => { navigate('/me?panel=notifications'); }}>
                        <Bell size={18} />
                        {unreadNotifCount > 0 && <span className="bell-badge-glow">{unreadNotifCount}</span>}
                      </button>
                      <div className="header-pill-wallet" onClick={() => { navigate('/me?panel=wallet'); }}>
                        <Coins size={16} className="coin-gold-glow" />
                        <AnimatedBalance balance={getCoinBalance()} />
                      </div>
                    </div>
                  </header>
                )}
                {/* Scrollable View Content */}
                <main className="app-mobile-main-content">
                  <Routes>
                    <Route 
                      path="/play" 
                      element={
                        <PlayView 
                          setView={(v) => {
                            if (v !== 'gameLobbies') {
                              navigate(v === 'myMatches' ? '/my-matches' : `/${v}`);
                            }
                          }} 
                          setSelectedGame={(game) => navigate(`/lobbies/${game}`)} 
                        />
                      } 
                    />
                    <Route path="/earn" element={<EarnView />} />
                    <Route 
                      path="/me" 
                      element={
                        <MeView 
                          initialPanel={panel} 
                          setActivePanel={(p) => navigate(p === 'menu' ? '/me' : `/me?panel=${p}`)} 
                        />
                      } 
                    />
                    <Route 
                      path="/my-matches" 
                      element={
                        <MyMatchesView 
                          setView={(v) => navigate(v === 'play' ? '/play' : `/${v}`)} 
                        />
                      } 
                    />
                    <Route path="/lobbies/:gameId" element={<GameLobbyWrapper />} />
                    <Route path="*" element={<Navigate to="/play" replace />} />
                  </Routes>
                </main>
                {/* Bottom Navigation Bar */}
                <nav className="app-mobile-bottom-nav">
                  <button 
                    className={`nav-tab-item ${isActive('/earn') ? 'active' : ''}`}
                    onClick={() => navigate('/earn')}
                  >
                    <Award size={20} />
                    <span>Earn</span>
                  </button>
                  
                  <button 
                    className={`nav-tab-item ${isActive('/play') || isActive('/lobbies') ? 'active' : ''}`}
                    onClick={() => navigate('/play')}
                  >
                    <Gamepad2 size={20} />
                    <span>Play</span>
                  </button>
                  
                  <button 
                    className={`nav-tab-item ${isActive('/me') || isActive('/my-matches') ? 'active' : ''}`}
                    onClick={() => navigate('/me')}
                  >
                    <User size={20} />
                    <span>Me</span>
                  </button>
                </nav>
                {showSpinOverlay && (
                  <GlobalSpinOverlay onClose={() => setShowSpinOverlay(false)} />
                )}
              </>
            )}
            {/* Phone Swipe-up Home Indicator */}
            <div className="phone-mockup-home-indicator-bar">
              <span className="home-indicator-line"></span>
            </div>
            {customAlert && (
              <div className="custom-alert-overlay">
                <div className="custom-alert-box animated-scale-up">
                  <div className="custom-alert-header">
                    <ShieldAlert size={28} className="highlight-gold" />
                    <h4>SkyArena Alert</h4>
                  </div>
                  <div className="custom-alert-message">
                    <p>{customAlert.message}</p>
                  </div>
                  <button className="custom-alert-btn" onClick={() => setCustomAlert(null)}>
                    OK
                  </button>
                </div>
              </div>
            )}
            {showInstallPopup && (
              <div className="custom-alert-overlay" style={{ zIndex: 9999 }}>
                <div className="custom-alert-box animated-scale-up" style={{ textAlign: 'center', padding: '24px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', border: '3px solid var(--color-primary)', boxShadow: '0 0 15px rgba(14, 165, 233, 0.4)' }}>
                      <img src="/img/logo.png" alt="SkyArena Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                  <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '8px' }}>Install SkyArena PWA</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '20px' }}>
                    Install the application on your device for instant access, offline support, and full-screen gaming experience!
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="custom-alert-btn" 
                      onClick={() => {
                        sessionStorage.setItem('pwa_install_dismissed', 'true');
                        setShowInstallPopup(false);
                      }}
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                    >
                      Later
                    </button>
                    <button 
                      className="custom-alert-btn" 
                      onClick={handleInstallClick}
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', boxShadow: '0 0 10px rgba(14, 165, 233, 0.3)', cursor: 'pointer' }}
                    >
                      Install Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <DBProvider>
        <AppContent />
      </DBProvider>
    </BrowserRouter>
  );
}
