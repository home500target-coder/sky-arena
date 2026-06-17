import React, { useState, useEffect } from 'react';
import { useDB } from '../context/DBContext';
import { Gift, Share2, Zap, Coins, ShoppingBag, ArrowLeft, Copy, Check, Users, HelpCircle } from 'lucide-react';

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

function RedeemThumbnail({ id, image, name }) {
  if (id === 'gp_100') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
      }}>
        <svg viewBox="0 0 24 24" width="22" height="22">
          {/* Blue Sector */}
          <path d="M3,4 L12,12 L3,20 Z" fill="#00E5FF" />
          {/* Red Sector */}
          <path d="M3,4 L12,12 L16.5,7.5 Z" fill="#FF1744" />
          {/* Yellow Sector */}
          <path d="M16.5,7.5 L12,12 L16.5,16.5 L21,12 Z" fill="#FFEA00" />
          {/* Green Sector */}
          <path d="M3,20 L12,12 L16.5,16.5 Z" fill="#00E676" />
        </svg>
      </div>
    );
  }
  
  if (id === 'amz_50') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#131921',
        paddingTop: '2px'
      }}>
        <span style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '0.55rem',
          fontWeight: '900',
          color: '#ffffff',
          letterSpacing: '-0.3px',
          lineHeight: '1',
          fontStyle: 'italic'
        }}>amazon</span>
        <svg viewBox="0 0 100 40" width="28" height="10" style={{ marginTop: '0px' }}>
          <path d="M10,12 C35,32 65,32 90,12" fill="none" stroke="#ff9900" strokeWidth="8" strokeLinecap="round" />
          <path d="M78,14 C82,10 88,4 92,2 C91,8 87,17 84,22" fill="#ff9900" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <img src={image} alt={name} className="redeem-item-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  );
}

export default function EarnView() {
  const { user, redeemReward, setShowSpinOverlay, fetchReferrals } = useDB();
  const [showReferralDetail, setShowReferralDetail] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Shop catalog items
  const catalog = [
    { 
      id: 'gp_100', 
      name: 'Google Play Gift Card (₹100)', 
      cost: 100, 
      bgColor: '#ffffff'
    },
    { 
      id: 'bgmi_uc', 
      name: 'BGMI 60 UC Voucher', 
      cost: 75, 
      image: '/img/bgmi.avif',
      bgColor: '#1e293b'
    },
    { 
      id: 'ff_dia', 
      name: 'Free Fire 100 Diamonds Pack', 
      cost: 80, 
      image: '/img/freefire.avif',
      bgColor: '#1e293b'
    },
    { 
      id: 'amz_50', 
      name: 'Amazon Pay Gift Card (₹50)', 
      cost: 50, 
      bgColor: '#131921'
    }
  ];

  // Real Referral state variables dynamically loaded from database
  const [referralCode, setReferralCode] = useState(user?.referralCode || '');
  const [referredFriends, setReferredFriends] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  useEffect(() => {
    if (user) {
      const loadReferrals = async () => {
        setLoadingReferrals(true);
        const data = await fetchReferrals();
        setReferralCode(data.referralCode || user.referralCode || '');
        setReferredFriends(data.referrals || []);
        setLoadingReferrals(false);
      };
      loadReferrals();
    }
  }, [user]);

  const referCount = referredFriends.length;
  const referEarnings = referredFriends.filter(f => f.status === "Success").reduce((acc, f) => acc + (f.reward || 10), 0);

  const handleShareReferral = (e) => {
    if (e) e.stopPropagation();
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    alert(`Referral code "${referralCode}" copied to clipboard! Share it with your friends to earn 3 spins on their first deposit.`);
  };

  const handleRedeem = (item) => {
    const totalBalance = user.wallet.deposit + user.wallet.winnings;
    if (totalBalance < item.cost) {
      alert(`Insufficient balance! You need ₹${item.cost} to redeem this card. (Current balance: ₹${totalBalance.toFixed(0)})`);
      return;
    }

    const confirmRedeem = window.confirm(`Redeem "${item.name}" for ₹${item.cost}? This will deduct the amount from your wallet.`);
    if (confirmRedeem) {
      const res = redeemReward(item.name, item.cost);
      alert(res.message);
    }
  };

  if (showReferralDetail) {
    return (
      <div className="referral-detail-view">
        {/* Yellow Navigation Header */}
        <div className="lobby-header-bar curved-yellow-header">
          <button className="back-arrow-btn dark-icon" onClick={() => setShowReferralDetail(false)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div className="lobby-header-title dark-title">
            <h3>Refer & Earn Details</h3>
          </div>
          <div style={{ width: 20 }}></div>
        </div>

        <div className="referral-detail-body">
          {/* Quick stats summary cards */}
          <div className="referral-summary-card">
            <div className="referral-stat-item">
              <span className="referral-stat-val">{referCount}</span>
              <span className="referral-stat-lbl">Total Invites</span>
            </div>
            <div className="referral-stat-item" style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', padding: '0 20px' }}>
              <span className="referral-stat-val">{referredFriends.filter(f => f.status === 'Success').length}</span>
              <span className="referral-stat-lbl">Successful</span>
            </div>
            <div className="referral-stat-item">
              <span className="referral-stat-val">{referEarnings} Spins</span>
              <span className="referral-stat-lbl">Total Earned</span>
            </div>
          </div>

          {/* Code Section */}
          <div className="referral-code-section">
            <h5>Your Unique Referral Code</h5>
            <div className="referral-code-display">{referralCode}</div>
            <button className="referral-copy-btn" onClick={handleShareReferral}>
              {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedCode ? 'Copied!' : 'Copy & Share Code'}</span>
            </button>
          </div>

          {/* Link Section */}
          <div className="referral-code-section" style={{ marginTop: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
            <h5>Your Referral Link</h5>
            <div className="referral-code-display" style={{ fontSize: '0.65rem', padding: '10px 8px', wordBreak: 'break-all', textTransform: 'none' }}>
              {`${window.location.origin}/?ref=${referralCode}`}
            </div>
            <button className="referral-copy-btn" onClick={() => {
              if (!referralCode) return;
              navigator.clipboard.writeText(`${window.location.origin}/?ref=${referralCode}`);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
              alert('Referral link copied to clipboard! Share it with your friends to open the signup page directly.');
            }}>
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Referral Link'}</span>
            </button>
          </div>

          {/* How it works */}
          <div className="referral-steps-box">
            <h5>How It Works</h5>
            <div className="referral-step-row">
              <div className="referral-step-num">1</div>
              <div className="referral-step-text">
                <strong>Share your code:</strong> Copy your referral code and share it with your friends via WhatsApp, Telegram, or Discord.
              </div>
            </div>
            <div className="referral-step-row">
              <div className="referral-step-num">2</div>
              <div className="referral-step-text">
                <strong>Friend joins & links identity:</strong> Your friend registers on SkyArena and links their correct game Character ID in their Profile.
              </div>
            </div>
            <div className="referral-step-row">
              <div className="referral-step-num">3</div>
              <div className="referral-step-text">
                <strong>Get spins on deposit:</strong> When your friend makes their <strong>first deposit</strong>, both you and your friend get <strong>3 free spins</strong> instantly!
              </div>
            </div>
          </div>

          {/* Referred details list */}
          <div className="referred-list-box">
            <h5>Referred Friends ({referredFriends.length})</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {referredFriends.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '15px 0' }}>
                  No friends referred yet. Share your code to start earning!
                </p>
              ) : (
                referredFriends.map((friend, idx) => (
                <div className="referred-friend-card" key={idx}>
                  <div className="referred-friend-info">
                    <span className="referred-friend-name">{friend.name}</span>
                    <span className="referred-friend-id">Character ID: {friend.id}</span>
                  </div>
                  <div className="referred-friend-status">
                    <span className={`status-badge-pill ${friend.status.toLowerCase()}`}>
                      {friend.status === 'Success' ? 'SUCCESSFUL' : 'PENDING'}
                    </span>
                    <span className={`referral-reward-amount ${friend.reward > 0 ? 'win' : 'none'}`}>
                      {friend.reward > 0 ? `+${friend.reward} Spins` : '0 Spins'}
                    </span>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="earn-view-container">
      
      {/* 1. Refer & Earn Box */}
      <div className="earn-gradient-card refer-earn" onClick={() => setShowReferralDetail(true)} style={{ cursor: 'pointer' }}>
        <div className="card-left">
          <span className="card-badge">HOT PROMO</span>
          <h4>Refer & Earn Spins</h4>
          <p>Get 3 free spins for you and your friend when they join using your code and make their first deposit. Click to see details.</p>
          
          <div className="referral-code-pill" onClick={handleShareReferral}>
            <code>{referralCode}</code>
            <Share2 size={14} />
          </div>
        </div>
        <div className="card-right">
          <div className="ref-stats-circle">
            <span className="ref-num">{referCount}</span>
            <span className="ref-lbl">Invites</span>
          </div>
          <span className="earnings-pill">Spins: {referEarnings}</span>
        </div>
      </div>

      {/* 2. Lucky Draw Spin Wheel Box */}
      <div className="earn-card lucky-draw">
        <div className="section-header">
          <div className="icon-badge">
            <Zap size={18} className="highlight-gold" />
          </div>
          <div className="header-text">
            <h4>Lucky Spin Wheel</h4>
            <span>Win free cash vouchers daily</span>
          </div>
        </div>

        <div className="spin-wheel-promo-card">
          <div className="promo-left">
            <div className="promo-bonus-badge">FREE DAILY DRAW</div>
            <h5>Spin & Win Cash</h5>
            <p>Participate in our daily lucky draw. Win up to ₹50 cash deposited instantly to your winnings wallet!</p>
            <button className="open-spin-overlay-btn" onClick={() => setShowSpinOverlay(true)}>
              PLAY LUCKY SPIN
            </button>
          </div>
          <div className="promo-right">
            <div className="mini-wheel-graphic">
              <Zap size={32} className="spin-icon-glow" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Store Shop */}
      <div className="earn-card product-shop">
        <div className="section-header">
          <div className="icon-badge blue">
            <ShoppingBag size={18} />
          </div>
          <div className="header-text">
            <h4>Rewards Redeem Shop</h4>
            <span>Exchange cash balance for game currency</span>
          </div>
        </div>

        <div className="shop-grid">
          {catalog.map((item) => (
            <div className="shop-item-card" key={item.id}>
              <div className="shop-item-body">
                <div className="item-thumbnail" style={{ backgroundColor: item.bgColor, overflow: 'hidden' }}>
                  <RedeemThumbnail id={item.id} image={item.image} name={item.name} />
                </div>
                <div className="item-info">
                  <h5>{item.name}</h5>
                  <div className="item-price">
                    <Coins size={14} className="coin-gold-glow" />
                    <span>Cost: ₹{item.cost}</span>
                  </div>
                </div>
              </div>
              <button className="redeem-btn" onClick={() => handleRedeem(item)}>
                Redeem Card
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
