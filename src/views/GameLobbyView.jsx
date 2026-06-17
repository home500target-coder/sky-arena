import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { ArrowLeft, Search, Shield, Award, CheckCircle, Key, ChevronDown, Trophy, AlertCircle, RefreshCw } from 'lucide-react';

const formatMatchTime = (isoString) => {
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
    return `${day}-${month}-${year} At ${strTime}`;
  } catch (error) {
    return 'TBD';
  }
};

export default function GameLobbyView({ setView, selectedGame }) {
  const { user, matches, registrations, joinMatch, linkGameIdentity, loadMatchRegistrations, depositFunds } = useDB();

  const getOrganizerName = (organizerId, organizerName) => {
    if (organizerId === user.id) return "You";
    if (organizerName) return organizerName;
    if (organizerId === 'usr_organizer_alpha') return 'Alpha Esports';
    if (organizerId === 'usr_organizer_beta') return 'Beta Gaming';
    if (typeof organizerId !== 'string') return 'Organizer';
    return organizerId
      .replace(/^usr_/, '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const [activeSubTab, setActiveSubTab] = useState('upcoming'); // upcoming, ongoing, results
  const [searchQuery, setSearchQuery] = useState('');

  // Slot selector states
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [selectedMatchForSlots, setSelectedMatchForSlots] = useState(null);
  const [selectedSlotNum, setSelectedSlotNum] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');

  // Results page states
  const [selectedMatchForResults, setSelectedMatchForResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Match details roster states
  const [selectedMatchForDetails, setSelectedMatchForDetails] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  
  // Local link states inside slot selector
  const [localCharId, setLocalCharId] = useState('');
  const [localIGN, setLocalIGN] = useState('');
  const [linkErrors, setLinkErrors] = useState({});
  const [popupConfig, setPopupConfig] = useState(null);

  // Filter matches for current game and tab status
  const getFilteredMatches = () => {
    const filtered = matches.filter(m => {
      // Game match check
      if (m.game !== selectedGame) return false;

      // Skip league matches since they are coming soon
      if (m.type === 'League') return false;

      // Query check
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Status sub-tab check
      if (activeSubTab === 'upcoming') {
        return m.status === 'Registering' || m.status === 'Full' || m.status === 'RoomReady';
      } else if (activeSubTab === 'ongoing') {
        return m.status === 'Live';
      } else if (activeSubTab === 'results') {
        return m.status === 'Completed';
      }
      return false;
    });

    // Sort by createdAt descending (latest tournament on top)
    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

  const filteredMatches = getFilteredMatches();

  // Helper to check if current user is registered for a match
  const isUserRegistered = (matchId) => {
    return registrations.some(r => r.matchId === matchId && r.userId === user.id);
  };

  // Helper to get registration details for current user
  const getUserRegistration = (matchId) => {
    return registrations.find(r => r.matchId === matchId && r.userId === user.id);
  };

  // Open slot selector
  const handleOpenSlotSelector = (match, preSelectedSlotNum = null) => {
    if (isUserRegistered(match.matchId)) return;
    setSelectedMatchForSlots(match);
    setSelectedSlotNum(preSelectedSlotNum);
    setLocalCharId('');
    setLocalIGN('');
    setShowSlotSelector(true);
    
    // Auto-calculate required deposit amount if balance is low
    const balance = user ? user.wallet.deposit + user.wallet.winnings : 0;
    if (balance < match.entryFee) {
      setDepositAmount((match.entryFee - balance).toString());
    } else {
      setDepositAmount('');
    }
  };

  // Deterministic generator of other players booked slots
  const getBookedSlotsForMatch = (match) => {
    const realRegs = registrations.filter(r => r.matchId === match.matchId);
    const booked = new Set();
    
    // Add real registrations
    realRegs.forEach(r => {
      if (r.slotNumber) {
        booked.add(r.slotNumber);
      }
    });

    const targetBookedCount = match.slots.joined;
    let slotId = 1;
    while (booked.size < targetBookedCount && slotId <= match.slots.total) {
      // Skip the slot that the active user might have selected
      const isMeRegistered = registrations.some(
        r => r.matchId === match.matchId && r.slotNumber === slotId && r.userId === user.id
      );
      if (isMeRegistered) {
        booked.add(slotId);
        slotId++;
        continue;
      }

      // Deterministic hashing based on matchId and slotId
      const hashStr = match.matchId + "_" + slotId;
      let hash = 0;
      for (let i = 0; i < hashStr.length; i++) {
        hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      const rand = Math.abs(Math.sin(hash)) * 1000 % 1;
      
      if (rand > 0.4) {
        booked.add(slotId);
      }
      slotId++;
    }

    // Fallback fill to match slots.joined exactly
    for (let i = 1; i <= match.slots.total; i++) {
      if (booked.size >= targetBookedCount) break;
      const isMeRegistered = registrations.some(
        r => r.matchId === match.matchId && r.slotNumber === i && r.userId === user.id
      );
      if (!booked.has(i) && !isMeRegistered) {
        booked.add(i);
      }
    }

    return booked;
  };

  // Handle slot selection
  const handleSelectSlot = (slotNum, isBooked) => {
    if (isBooked) return;
    setSelectedSlotNum(slotNum === selectedSlotNum ? null : slotNum);
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedSlotNum) return;
    const match = selectedMatchForSlots;
    
    const fee = match.entryFee;
    const totalBalance = user.wallet.deposit + user.wallet.winnings;
    if (totalBalance < fee) {
      setPopupConfig({
        type: 'info',
        title: 'Insufficient Funds',
        message: 'Insufficient wallet balance. Please deposit funds first.'
      });
      return;
    }

    // Map slotNum to team details for Duo/Squad
    let teamNumber = null;
    let teamSlotPosition = null;
    
    if (match.mode === 'Duo') {
      teamNumber = Math.ceil(selectedSlotNum / 2);
      teamSlotPosition = ((selectedSlotNum - 1) % 2) + 1;
    } else if (match.mode === 'Squad') {
      teamNumber = Math.ceil(selectedSlotNum / 4);
      teamSlotPosition = ((selectedSlotNum - 1) % 4) + 1;
    }

    const slotDetails = {
      slotNumber: selectedSlotNum,
      teamNumber,
      teamSlotPosition
    };

    setPopupConfig({
      type: 'confirm',
      title: 'Confirm Booking',
      message: `Are you sure you want to book Slot #${selectedSlotNum}? An entry fee of ₹${fee} will be deducted from your wallet.`,
      onConfirm: async () => {
        setBookingSlot(true);
        try {
          const res = await joinMatch(match.matchId, "", slotDetails);
          if (res.success) {
            setPopupConfig({
              type: 'info',
              title: 'Success',
              message: res.message,
              onConfirm: () => {
                setShowSlotSelector(false);
                setSelectedMatchForSlots(null);
              }
            });
          } else {
            setPopupConfig({
              type: 'info',
              title: 'Booking Failed',
              message: res.message
            });
          }
        } catch (error) {
          setPopupConfig({
            type: 'info',
            title: 'Error',
            message: 'Failed to join match.'
          });
        } finally {
          setBookingSlot(false);
        }
      }
    });
  };

  // Direct slot booking from participants tab
  const handleDirectBookSlot = async (match, slotNum) => {
    console.log("Direct booking initiated", { match, slotNum, user });
    try {
      if (!user) {
        console.error("Direct booking error: user is null or undefined");
        return;
      }
      const game = match?.game;
      if (!game) {
        console.error("Direct booking error: game is null or undefined");
        return;
      }
      const identities = user.identities || {};
      const gameIdentity = identities[game] || {};
      const hasIdentity = gameIdentity.characterId && gameIdentity.inGameName;

      if (!hasIdentity) {
        setPopupConfig({
          type: 'info',
          title: 'Identity Link Required',
          message: `Please link your in-game identity for ${game === 'bgmi' ? 'BGMI' : 'Free Fire'} before booking a slot.`,
          onConfirm: () => {
            handleOpenSlotSelector(match, slotNum);
          }
        });
        return;
      }

      const fee = match?.entryFee || 0;
      const wallet = user.wallet || { deposit: 0, winnings: 0 };
      const totalBalance = (wallet.deposit || 0) + (wallet.winnings || 0);

      // Helper to perform the actual slot registration call
      const executeSlotBooking = async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        setPopupConfig({
          type: 'info',
          title: 'Booking Slot...',
          message: 'Processing your registration. Please wait...',
          preventClose: true
        });

        let teamNumber = null;
        let teamSlotPosition = null;
        
        if (match?.mode === 'Duo') {
          teamNumber = Math.ceil(slotNum / 2);
          teamSlotPosition = ((slotNum - 1) % 2) + 1;
        } else if (match?.mode === 'Squad') {
          teamNumber = Math.ceil(slotNum / 4);
          teamSlotPosition = ((slotNum - 1) % 4) + 1;
        }

        const slotDetails = {
          slotNumber: slotNum,
          teamNumber,
          teamSlotPosition
        };

        try {
          const res = await joinMatch(match?.matchId, "", slotDetails);
          if (res.success) {
            await loadMatchRegistrations(match?.matchId);
            setPopupConfig({
              type: 'info',
              title: 'Success',
              message: `Successfully booked Slot #${slotNum}!`,
            });
          } else {
            setPopupConfig({
              type: 'info',
              title: 'Booking Failed',
              message: res.message
            });
          }
        } catch (error) {
          setPopupConfig({
            type: 'info',
            title: 'Error',
            message: 'Failed to book slot.'
          });
        }
      };

      if (totalBalance >= fee) {
        setPopupConfig({
          type: 'confirm',
          title: 'Confirm Booking',
          message: `Are you sure you want to book Slot #${slotNum}? An entry fee of ₹${fee} will be deducted from your wallet.`,
          onConfirm: executeSlotBooking
        });
      } else {
        const shortage = fee - totalBalance;
        const allowedAmounts = [20, 30, 50, 100, 200, 300, 400, 500, 1000];
        const depositAmountToApply = allowedAmounts.find(amt => amt >= shortage) || 1000;

        setPopupConfig({
          type: 'confirm',
          title: 'Insufficient Funds',
          message: `Your balance is ₹${totalBalance.toFixed(0)}. You need to add ₹${shortage.toFixed(0)} more to book Slot #${slotNum}. We will add the closest valid fixed deposit of ₹${depositAmountToApply}. Would you like to add cash and proceed?`,
          onConfirm: async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            setPopupConfig({
              type: 'info',
              title: 'Processing Payment',
              message: 'Opening Razorpay payment gateway...',
              preventClose: true
            });
            try {
              const paymentSuccess = await depositFunds(depositAmountToApply);
              if (paymentSuccess) {
                await executeSlotBooking();
              } else {
                setPopupConfig({
                  type: 'info',
                  title: 'Payment Cancelled',
                  message: 'Deposit was not completed. Slot booking cancelled.'
                });
              }
            } catch (err) {
              setPopupConfig({
                type: 'info',
                title: 'Payment Error',
                message: 'An error occurred during payment processing.'
              });
            }
          }
        });
      }
    } catch (error) {
      console.error("Error in handleDirectBookSlot:", error);
      setPopupConfig({
        type: 'info',
        title: 'Error',
        message: 'An error occurred while initiating booking.'
      });
    }
  };

  // Render Upcoming Match Details & Roster Page
  if (selectedMatchForDetails) {
    const match = selectedMatchForDetails;
    const joinedRegs = registrations
      .filter(r => r.matchId === match.matchId)
      .sort((a, b) => (a.slotNumber || 999) - (b.slotNumber || 999));

    const calculatedPrizePool = match.prizePool || 
      (match.entryFee * match.slots.total * (1 - match.hostCommissionPercent / 100));

    const gameBanner = match.game === 'freefire' ? '/img/freefire.avif' : '/img/bgmi.avif';
    const totalSlotsCount = match.slots.total;
    const teamSize = match.mode === 'Duo' ? 2 : match.mode === 'Squad' ? 4 : 1;
    const totalTeamsCount = match.mode !== 'Solo' ? totalSlotsCount / teamSize : 0;
    const bookingsMap = {};
    joinedRegs.forEach(reg => {
      if (reg.slotNumber) {
        bookingsMap[reg.slotNumber] = reg;
      }
    });

    return (
      <div className="slots-selector-container">
        {/* Header bar */}
        <div className="lobby-header-bar curved-yellow-header">
          <button className="back-arrow-btn dark-icon" onClick={() => { setSelectedMatchForDetails(null); setShowParticipants(false); }}>
            <ArrowLeft size={20} />
          </button>
          <div className="lobby-header-title dark-title">
            <h3>Tournament Details</h3>
          </div>
          <div style={{ width: 20 }}></div>
        </div>

        {/* Scrollable Content */}
        <div className="slots-scroll-area">
          
          {/* Match Description Banner Card */}
          <div className="premium-white-card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
            <div className="lobby-card-banner-wrapper" style={{ height: '120px' }}>
              <img src={gameBanner} alt={match.title} className="lobby-card-banner-img" />
            </div>
            <div style={{ padding: '14px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
                {match.title.toUpperCase()}
              </h4>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', marginBottom: '4px' }}>
                Organized By: <strong className="highlight-red">{getOrganizerName(match.organizerId, match.organizerName)}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '0.68rem', color: '#64748b', fontWeight: 'bold' }}>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MAP: {match.mapType === 'ClashSquad' ? 'Clash Arena' : match.map}</span>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MODE: {match.mapType === 'ClashSquad' ? `CS (${match.clashSquadFormat})` : match.mode}</span>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>TPP</span>
              </div>
            </div>
          </div>

          {/* Display Room Credentials if host has updated and player is registered */}
          {match.status === 'RoomReady' && isUserRegistered(match.matchId) && (
            <div className="room-credentials-box dark-creds" style={{ marginBottom: '16px', backgroundColor: 'rgba(234, 179, 8, 0.05)', border: '1px solid var(--color-primary)' }}>
              <div className="room-creds-title">
                <Key size={16} className="highlight-gold" />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Room Details Received!</span>
              </div>
              <div className="room-creds-info" style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.75rem' }}>
                <div>Room ID: <strong className="selectable-text" style={{ color: 'white', fontSize: '0.85rem' }}>{match.roomDetails.roomId}</strong></div>
                <div>Password: <strong className="selectable-text" style={{ color: 'white', fontSize: '0.85rem' }}>{match.roomDetails.roomPass}</strong></div>
              </div>
              <p style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '8px', margin: 0 }}>
                Copy these credentials and join the custom room in-game. Do not share these credentials with non-joined players.
              </p>
            </div>
          )}

          {/* Display Room Credentials if match is Live and player is registered */}
          {match.status === 'Live' && isUserRegistered(match.matchId) && (
            <div className="room-credentials-box dark-creds" style={{ marginBottom: '16px', border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
              <div className="room-creds-title">
                <span className="pulse-red-dot" style={{ width: 8, height: 8, display: 'inline-block', borderRadius: '50%', backgroundColor: '#ef4444', marginRight: 6 }}></span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>MATCH IS LIVE</span>
              </div>
              <div className="room-creds-info" style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.75rem' }}>
                <div>Room ID: <strong style={{ color: 'white' }}>{match.roomDetails.roomId}</strong></div>
                <div>Password: <strong style={{ color: 'white' }}>{match.roomDetails.roomPass}</strong></div>
              </div>
              <p style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '8px', margin: 0 }}>
                The match is currently in progress. Results will be uploaded by the organizer shortly.
              </p>
            </div>
          )}

          {/* Display waiting message if room credentials are not yet shared and player is registered */}
          {(match.status === 'Registering' || match.status === 'Full') && isUserRegistered(match.matchId) && (
            <div className="room-credentials-box dark-creds" style={{ marginBottom: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--color-border)' }}>
              <div className="room-creds-title" style={{ display: 'flex', alignItems: 'center' }}>
                <span className="spinner-dots" style={{ marginRight: 8 }}></span>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Waiting for Credentials</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px', margin: 0, lineHeight: '1.4' }}>
                Room ID and Password will be shown here before the match starts.
              </p>
            </div>
          )}

          {/* Rules / Rewards grid */}
          <div className="slots-match-banner-summary" style={{ borderBottom: 'none', marginBottom: 16 }}>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', marginBottom: '8px' }}>
              MATCH REWARDS & RULES
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
              <div>• Total Prize Pool: <strong className="highlight-gold">₹{calculatedPrizePool.toFixed(0)}</strong></div>
              <div>• Entry Fee: <strong className="highlight-gold">₹{match.entryFee}</strong></div>
              {match.prizeRules.type === 'PerKillAndPlacement' && (
                <div>• Reward Per Kill: <strong className="highlight-gold">₹{match.prizeRules.perKillPrize}</strong></div>
              )}
              {match.prizeRules.type === 'WinnerTakesAll' ? (
                match.mode === 'Solo' ? (
                  <div>• 1st Place: <strong>100% of Prize Pool (₹{calculatedPrizePool.toFixed(0)})</strong></div>
                ) : (
                  <div style={{ gridColumn: 'span 2' }}>
                    • 1st Place Team: <strong>100% of Prize Pool (₹{calculatedPrizePool.toFixed(0)}) split equally (₹{(calculatedPrizePool / (match.mode === 'Duo' ? 2 : 4)).toFixed(0)} each)</strong>
                  </div>
                )
              ) : (
                <>
                  {match.prizeRules.placementSplit['1st'] && <div>• 1st Place: <strong>₹{match.prizeRules.placementSplit['1st']}</strong></div>}
                  {match.prizeRules.placementSplit['2nd'] && <div>• 2nd Place: <strong>₹{match.prizeRules.placementSplit['2nd']}</strong></div>}
                  {match.prizeRules.placementSplit['3rd'] && <div>• 3rd Place: <strong>₹{match.prizeRules.placementSplit['3rd']}</strong></div>}
                </>
              )}
            </div>
          </div>

          {/* Strict Rules & Payout Policy */}
          <div className="slots-match-banner-summary" style={{ borderBottom: 'none', marginBottom: 16, backgroundColor: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: '#f87171', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Shield size={12} /> ANTI-CHEAT POLICY & ELIGIBILITY
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.66rem', color: 'var(--color-text-light)', lineHeight: '1.4' }}>
              <div>• <strong style={{ color: '#f87171' }}>Zero Tolerance Cheating Policy:</strong> Use of hacks, wallhacks, auto-aim, speed boosters, iPads, or emulators is strictly prohibited. Standard mobile phones only.</div>
              <div>• <strong style={{ color: '#f87171' }}>Punishment & Bans:</strong> Violations lead to immediate lobby disqualification (DQ), total forfeiture of registration fees, and permanent banning from the SkyArena ecosystem.</div>
              <div>• <strong>Reward Eligibility:</strong> Winnings are credited instantly to your wallet. You must link your correct character ID in your profile before joining. Mismatched character IDs will void placement and kill reward claims.</div>
              <div>• <strong>Collusion Rules:</strong> Teaming up with enemies in solo matches or using friendly fire in squad modes to farm kills results in an immediate ban. All matches are monitored in real-time by the host.</div>
            </div>
          </div>

          {/* Roster Header & Roster List with Load Button */}
          {!showParticipants ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button 
                className="lobby-join-btn-outline" 
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                onClick={async () => {
                  await loadMatchRegistrations(match.matchId);
                  setShowParticipants(true);
                }}
              >
                LOAD PARTICIPANTS ({match.slots.joined} Joined)
              </button>
            </div>
          ) : (
            <>
              {/* Roster Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', letterSpacing: '0.5px' }}>
                  REGISTERED ROSTER ({match.slots.joined}/{match.slots.total})
                </h5>
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.65rem', textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => setShowParticipants(false)}
                >
                  Hide
                </button>
              </div>

              {/* Roster List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {match.mode === 'Solo' ? (
                  Array.from({ length: totalSlotsCount }, (_, idx) => {
                    const slotNum = idx + 1;
                    const playerReg = bookingsMap[slotNum];
                    
                    if (playerReg) {
                      const isMe = playerReg.userId === user.id;
                      return (
                        <div 
                          key={`slot-${slotNum}`} 
                          className={`results-player-card ${isMe ? 'highlight-me' : ''}`}
                          style={{ padding: '10px 12px' }}
                        >
                          <div className="results-row-main">
                            <div className="results-rank-badge-col">
                              <div style={{ 
                                fontSize: '0.62rem', 
                                fontWeight: '800', 
                                color: isMe ? 'var(--color-primary)' : 'var(--color-text-muted)', 
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-heading)'
                              }}>
                                Slot #{slotNum}
                              </div>
                            </div>
                            
                            <div className="results-player-info">
                              <strong className="results-player-name" style={{ fontSize: '0.75rem' }}>
                                {isMe 
                                  ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                                  : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} {isMe ? '(You)' : ''}
                              </strong>
                              <span className="results-player-id" style={{ fontSize: '0.6rem' }}>
                                IGN: {isMe 
                                  ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                                  : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} | ID: {playerReg.inGameCharacterId || playerReg.characterId || 'Linked'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div 
                          key={`slot-${slotNum}`} 
                          className="results-player-card"
                          style={{ 
                            padding: '10px 12px',
                            border: '1px dashed var(--color-border)',
                            backgroundColor: 'transparent',
                            opacity: 0.8
                          }}
                        >
                          <div className="results-row-main" style={{ justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="results-rank-badge-col">
                                <div style={{ 
                                  fontSize: '0.62rem', 
                                  fontWeight: '800', 
                                  color: 'var(--color-text-muted)', 
                                  backgroundColor: 'rgba(255,255,255,0.02)',
                                  border: '1px dashed var(--color-border)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontFamily: 'var(--font-heading)'
                                }}>
                                  Slot #{slotNum}
                                </div>
                              </div>
                              
                              <div className="results-player-info">
                                {/* Keep unbooked player details blank */}
                              </div>
                            </div>

                            {/* Book Button */}
                            {!isUserRegistered(match.matchId) && match.status === 'Registering' && (
                              <button
                                onClick={() => handleDirectBookSlot(match, slotNum)}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  color: 'var(--color-yellow-gold)',
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid var(--color-yellow-gold)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-heading)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-yellow-gold)'; e.currentTarget.style.color = 'black'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.color = 'var(--color-yellow-gold)'; }}
                              >
                                BOOK
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })
                ) : (
                  Array.from({ length: totalTeamsCount }, (_, tIdx) => {
                    const teamNum = tIdx + 1;
                    const teamSlots = [];
                    for (let pIdx = 0; pIdx < teamSize; pIdx++) {
                      const positionNum = pIdx + 1;
                      const slotNum = (teamNum - 1) * teamSize + positionNum;
                      const playerReg = bookingsMap[slotNum];
                      teamSlots.push({ slotNum, positionNum, playerReg });
                    }
                    const joinedCountInTeam = teamSlots.filter(s => s.playerReg).length;

                    return (
                      <div 
                        key={`team-${teamNum}`}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          color: 'var(--color-yellow-gold)', 
                          fontFamily: 'var(--font-heading)',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>TEAM {teamNum}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                            {joinedCountInTeam}/{teamSize} Joined
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {teamSlots.map(({ slotNum, positionNum, playerReg }) => {
                            if (playerReg) {
                              const isMe = playerReg.userId === user.id;
                              return (
                                <div 
                                  key={`slot-${slotNum}`} 
                                  className={`results-player-card ${isMe ? 'highlight-me' : ''}`}
                                  style={{ padding: '8px 10px', margin: 0 }}
                                >
                                  <div className="results-row-main">
                                    <div className="results-rank-badge-col">
                                      <div style={{ 
                                        fontSize: '0.6rem', 
                                        fontWeight: '800', 
                                        color: isMe ? 'var(--color-primary)' : 'var(--color-text-muted)', 
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--color-border)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontFamily: 'var(--font-heading)'
                                      }}>
                                        P{positionNum}
                                      </div>
                                    </div>
                                    
                                    <div className="results-player-info">
                                      <strong className="results-player-name" style={{ fontSize: '0.72rem' }}>
                                        {isMe 
                                          ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                                          : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} {isMe ? '(You)' : ''}
                                      </strong>
                                      <span className="results-player-id" style={{ fontSize: '0.58rem' }}>
                                        IGN: {isMe 
                                          ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                                          : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} | ID: {playerReg.inGameCharacterId || playerReg.characterId || 'Linked'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div 
                                  key={`slot-${slotNum}`} 
                                  className="results-player-card"
                                  style={{ 
                                    padding: '8px 10px', 
                                    border: '1px dashed var(--color-border)',
                                    backgroundColor: 'transparent',
                                    margin: 0,
                                    opacity: 0.8
                                  }}
                                >
                                  <div className="results-row-main" style={{ justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div className="results-rank-badge-col">
                                        <div style={{ 
                                          fontSize: '0.6rem', 
                                          fontWeight: '800', 
                                          color: 'var(--color-text-muted)', 
                                          backgroundColor: 'rgba(255,255,255,0.02)',
                                          border: '1px dashed var(--color-border)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontFamily: 'var(--font-heading)'
                                        }}>
                                          P{positionNum}
                                        </div>
                                      </div>
                                      
                                      <div className="results-player-info">
                                        {/* Keep unbooked player details blank */}
                                      </div>
                                    </div>

                                    {/* Book Button */}
                                    {!isUserRegistered(match.matchId) && match.status === 'Registering' && (
                                      <button
                                        onClick={() => handleDirectBookSlot(match, slotNum)}
                                        style={{
                                          padding: '3px 10px',
                                          fontSize: '0.6rem',
                                          fontWeight: 'bold',
                                          color: 'var(--color-yellow-gold)',
                                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                          border: '1px solid var(--color-yellow-gold)',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontFamily: 'var(--font-heading)',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-yellow-gold)'; e.currentTarget.style.color = 'black'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.color = 'var(--color-yellow-gold)'; }}
                                      >
                                        BOOK
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>

        {popupConfig && (
          <div className="custom-alert-overlay" style={{ zIndex: 3500 }}>
            <div className="custom-alert-box animated-scale-up" style={{ borderColor: 'var(--color-yellow-gold)', boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 20px rgba(245,158,11,0.25)' }}>
              <div className="custom-alert-header">
                {popupConfig.type === 'confirm' ? (
                  <Shield size={28} className="highlight-gold" />
                ) : popupConfig.title.toLowerCase().includes('fail') || popupConfig.title.toLowerCase().includes('error') || popupConfig.title.toLowerCase().includes('insufficient') ? (
                  <AlertCircle size={28} style={{ color: '#ef4444' }} />
                ) : (
                  <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
                )}
                <h4>{popupConfig.title}</h4>
              </div>
              <p className="custom-alert-message">{popupConfig.message}</p>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {popupConfig.type === 'confirm' ? (
                  <>
                    <button 
                      type="button" 
                      className="custom-alert-btn" 
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', boxShadow: 'none', color: 'var(--color-text-light)' }}
                      onClick={() => {
                        if (popupConfig.onCancel) popupConfig.onCancel();
                        setPopupConfig(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="custom-alert-btn"
                      onClick={() => {
                        if (popupConfig.onConfirm) popupConfig.onConfirm();
                        setPopupConfig(null);
                      }}
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="custom-alert-btn"
                    onClick={() => {
                      if (popupConfig.onConfirm) popupConfig.onConfirm();
                      setPopupConfig(null);
                    }}
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Complete Leaderboard Results Page
  if (selectedMatchForResults) {
    const match = selectedMatchForResults;
    const matchRegs = registrations
      .filter(r => r.matchId === match.matchId)
      .sort((a, b) => {
        if (a.matchStats.disqualified) return 1;
        if (b.matchStats.disqualified) return -1;
        return (a.matchStats.position || 999) - (b.matchStats.position || 999);
      });

    const calculatedPrizePool = match.prizePool || 
      (match.entryFee * match.slots.total * (1 - match.hostCommissionPercent / 100));

    return (
      <div className="slots-selector-container">
        {/* Header bar */}
        <div className="lobby-header-bar curved-yellow-header">
          <button className="back-arrow-btn dark-icon" onClick={() => setSelectedMatchForResults(null)}>
            <ArrowLeft size={20} />
          </button>
          <div className="lobby-header-title dark-title">
            <h3>Leaderboard Results</h3>
          </div>
          <div style={{ width: 20 }}></div>
        </div>

        {/* Scrollable Content */}
        <div className="slots-scroll-area">
          
          {/* Match Description Banner Card */}
          <div className="slots-match-banner-summary" style={{ borderBottom: 'none', marginBottom: 12 }}>
            <h4>{match.title}</h4>
            <span className="specs-pill" style={{ textTransform: 'uppercase' }}>MAP: {match.mapType === 'ClashSquad' ? 'Clash Arena' : match.map} | MODE: {match.mapType === 'ClashSquad' ? `CS (${match.clashSquadFormat})` : match.mode}</span>
            <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
              PRIZE POOL: <span className="highlight-gold">₹{calculatedPrizePool.toFixed(0)}</span> | ENTRY FEE: <span className="highlight-gold">₹{match.entryFee}</span>
            </div>
          </div>

          {/* Standings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingResults ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                <span className="spinner-dots" style={{ display: 'inline-block', marginRight: '6px' }}></span>
                Loading standings and results...
              </div>
            ) : matchRegs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: 'var(--color-card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                No participants joined this match.
              </div>
            ) : (
              matchRegs.map((playerReg, idx) => {
                const isMe = playerReg.userId === user.id;
                const isDisqualified = playerReg.matchStats.disqualified;
                const position = playerReg.matchStats.position || idx + 1;
                
                // Calculate winnings: per kill + placement splits
                let winnings = 0;
                if (!isDisqualified) {
                  const perKillWinnings = playerReg.matchStats.kills * match.prizeRules.perKillPrize;
                  let placementWinnings = 0;
                  const teamSize = match.mode === 'Duo' ? 2 : match.mode === 'Squad' ? 4 : 1;

                  if (position === 1) {
                    if (match.prizeRules.type === 'WinnerTakesAll') {
                      const feeCollected = match.slots.joined * match.entryFee;
                      const hostCommission = feeCollected * (match.hostCommissionPercent / 100);
                      placementWinnings = (feeCollected - hostCommission) / teamSize;
                    } else {
                      placementWinnings = (match.prizeRules.placementSplit['1st'] || 0) / teamSize;
                    }
                  } else if (position === 2) {
                    placementWinnings = (match.prizeRules.placementSplit['2nd'] || 0) / teamSize;
                  } else if (position === 3) {
                    placementWinnings = (match.prizeRules.placementSplit['3rd'] || 0) / teamSize;
                  }
                  winnings = perKillWinnings + placementWinnings;
                }

                return (
                  <div 
                    key={playerReg.registrationId} 
                    className={`results-player-card ${isMe ? 'highlight-me' : ''}`}
                  >
                    <div className="results-row-main">
                      <div className="results-rank-badge-col">
                        <div className={`results-rank-badge ${isDisqualified ? 'dq' : position === 1 ? 'rank-1' : position === 2 ? 'rank-2' : position === 3 ? 'rank-3' : 'rank-normal'}`}>
                          {isDisqualified ? 'DQ' : `#${position}`}
                        </div>
                      </div>
                      
                      <div className="results-player-info">
                        <strong className="results-player-name">
                          {isMe 
                            ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                            : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} {isMe ? '(You)' : ''}
                        </strong>
                        <span className="results-player-id">
                          IGN: {isMe 
                            ? (user.identities[match.game]?.inGameName || playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))
                            : (playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", ""))} | ID: {playerReg.inGameCharacterId || playerReg.characterId || 'N/A'}
                        </span>
                      </div>

                      <div className="results-stats-col">
                        <span className="results-kills">{playerReg.matchStats.kills} Kills</span>
                        <span className={`results-winnings ${isDisqualified ? 'dq' : winnings > 0 ? 'win' : 'none'}`}>
                          {isDisqualified ? '₹0' : `₹${winnings.toFixed(0)}`}
                        </span>
                      </div>
                    </div>

                    {isDisqualified && (
                      <div className="results-dq-reason">
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>Reason: {playerReg.matchStats.disqualificationReason || 'Rules violation'}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    );
  }

  // Render Slot Selection Panel
  if (showSlotSelector && selectedMatchForSlots) {
    const match = selectedMatchForSlots;
    const bookedSlots = getBookedSlotsForMatch(match);
    const totalSlotsCount = match.slots.total;
    const mode = match.mode; // Solo, Duo, Squad

    // Calculate dynamic team rows
    const teamSize = mode === 'Duo' ? 2 : mode === 'Squad' ? 4 : 1;
    const totalTeamsCount = mode !== 'Solo' ? totalSlotsCount / teamSize : 0;

    return (
      <div className="slots-selector-container">
        {/* Header bar */}
        <div className="lobby-header-bar curved-yellow-header">
          <button className="back-arrow-btn dark-icon" onClick={() => setShowSlotSelector(false)}>
            <ArrowLeft size={20} />
          </button>
          <div className="lobby-header-title dark-title">
            <h3>Choose Your Slot</h3>
          </div>
          <div style={{ width: 20 }}></div>
        </div>

        {/* Match description banner */}
        <div className="slots-match-banner-summary">
          <h4>{match.title}</h4>
          <span className="specs-pill">Mode: {match.mapType === 'ClashSquad' ? `CS (${match.clashSquadFormat})` : mode} ({match.mapType === 'ClashSquad' ? 'Clash Arena' : match.map})</span>
        </div>

        {!(user.identities[match.game]?.characterId && user.identities[match.game]?.inGameName) ? (
          <div className="slots-scroll-area" style={{ padding: '20px' }}>
            <div className="room-credentials-box dark-creds" style={{ border: '1px solid var(--color-primary)', backgroundColor: 'rgba(234, 179, 8, 0.02)', padding: '16px', marginBottom: '20px' }}>
              <h5 style={{ color: 'var(--color-primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Shield size={14} /> Link In-Game Identity
              </h5>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                To join this tournament, you must link your correct character ID and In-Game Name for {match.game === 'bgmi' ? 'Battlegrounds Mobile India' : 'Garena Free Fire Max'}.
              </p>
            </div>

            <form noValidate onSubmit={(e) => {
              e.preventDefault();
              const errs = {};
              if (!localCharId.trim()) {
                errs.charId = 'Character ID is required';
              }
              if (!localIGN.trim()) {
                errs.ign = 'In-Game Name (IGN) is required';
              }
              if (Object.keys(errs).length > 0) {
                setLinkErrors(errs);
                return;
              }
              setLinkErrors({});
              linkGameIdentity(match.game, localCharId.trim(), localIGN.trim());
              setPopupConfig({
                type: 'info',
                title: 'Identity Linked',
                message: 'Identity linked successfully! You can now choose your slot.'
              });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-text-light)' }}>
                  Character ID (Numeric)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 590431289" 
                  value={localCharId}
                  onChange={(e) => { setLocalCharId(e.target.value); if (linkErrors.charId) setLinkErrors(prev => ({ ...prev, charId: null })); }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: linkErrors.charId ? '1px solid #ef4444' : '1px solid var(--color-border)', backgroundColor: '#071120', color: 'white', fontSize: '0.8rem' }}
                />
                {linkErrors.charId && <span className="custom-input-error">{linkErrors.charId}</span>}
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-text-light)' }}>
                  In-Game Name (IGN)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. KillerIGN" 
                  value={localIGN}
                  onChange={(e) => { setLocalIGN(e.target.value); if (linkErrors.ign) setLinkErrors(prev => ({ ...prev, ign: null })); }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: linkErrors.ign ? '1px solid #ef4444' : '1px solid var(--color-border)', backgroundColor: '#071120', color: 'white', fontSize: '0.8rem' }}
                />
                {linkErrors.ign && <span className="custom-input-error">{linkErrors.ign}</span>}
              </div>

              <button 
                type="submit" 
                className="save-link-ids-btn"
                style={{ marginTop: '10px', width: '100%', padding: '12px' }}
              >
                Link Game Profile & Continue
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Legend box */}
            <div className="slots-legend">
              <div className="legend-item">
                <span className="legend-color available"></span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="legend-color booked"></span>
                <span>Booked</span>
              </div>
              <div className="legend-item">
                <span className="legend-color selected"></span>
                <span>Selected</span>
              </div>
            </div>

            {/* Inline deposit card if insufficient balance */}
            {user && (user.wallet.deposit + user.wallet.winnings) < match.entryFee && (
              <div className="room-credentials-box dark-creds animate-pulse" style={{ margin: '14px', borderColor: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '14px', borderRadius: '10px' }}>
                <h5 style={{ color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: 'bold' }}>
                  <AlertCircle size={15} /> Insufficient Funds (Entry: ₹{match.entryFee})
                </h5>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '10px', lineHeight: '1.4' }}>
                  Your current balance is ₹{(user.wallet.deposit + user.wallet.winnings).toFixed(0)}. Please add ₹{(match.entryFee - (user.wallet.deposit + user.wallet.winnings)).toFixed(0)} or more to participate.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>Select Deposit Amount (₹)</label>
                  <div className="fixed-amounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[20, 30, 50, 100, 200, 300, 400, 500, 1000].map((amount) => {
                      const isSelected = parseFloat(depositAmount) === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          className={`fixed-amount-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setDepositAmount(amount.toString());
                            if (depositError) setDepositError('');
                          }}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '6px',
                            border: isSelected 
                              ? '2px solid var(--color-primary)' 
                              : '1px solid var(--color-border)',
                            backgroundColor: isSelected 
                              ? 'rgba(14, 165, 233, 0.1)' 
                              : '#071120',
                            color: isSelected 
                              ? 'var(--color-primary)' 
                              : 'white',
                            fontSize: '0.75rem',
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
                  {depositError && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold' }}>{depositError}</span>}
                  <button 
                    type="button"
                    onClick={async () => {
                      const amountClean = parseFloat(depositAmount);
                      const allowedDepositAmounts = [20, 30, 50, 100, 200, 300, 400, 500, 1000];
                      if (isNaN(amountClean) || !allowedDepositAmounts.includes(amountClean)) {
                        setDepositError('Please select a valid deposit amount');
                        return;
                      }
                      setDepositError('');
                      setDepositing(true);
                      try {
                        const success = await depositFunds(amountClean);
                        if (success) {
                          setDepositAmount('');
                        }
                      } catch (error) {
                        console.error(error);
                      } finally {
                        setDepositing(false);
                      }
                    }}
                    disabled={depositing}
                    className="save-link-ids-btn"
                    style={{ padding: '10px', fontSize: '0.8rem', width: '100%', marginTop: '4px' }}
                  >
                    {depositing ? <RefreshCw size={14} className="spin-animate" /> : 'Add Cash'}
                  </button>
                </div>
              </div>
            )}

            {/* Slot Grid/List depending on mode */}
            <div className="slots-scroll-area">
              {mode === 'Solo' ? (
                <div className="slots-grid-solo">
                  {Array.from({ length: totalSlotsCount }, (_, idx) => {
                    const slotNum = idx + 1;
                    const isBooked = bookedSlots.has(slotNum);
                    const isSelected = selectedSlotNum === slotNum;

                    let stateClass = 'available';
                    if (isBooked) stateClass = 'booked';
                    if (isSelected) stateClass = 'selected';

                    return (
                      <button 
                        key={slotNum}
                        className={`slot-box-solo ${stateClass}`}
                        onClick={() => handleSelectSlot(slotNum, isBooked)}
                        disabled={isBooked}
                      >
                        {slotNum}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="slots-team-list">
                  {Array.from({ length: totalTeamsCount }, (_, tIdx) => {
                    const teamNum = tIdx + 1;
                    
                    return (
                      <div className="slots-team-card" key={teamNum}>
                        <span className="slots-team-title">Team {teamNum}</span>
                        <div className={`slots-team-grid team-cols-${teamSize}`}>
                          {Array.from({ length: teamSize }, (_, pIdx) => {
                            const positionNum = pIdx + 1;
                            const slotNum = (teamNum - 1) * teamSize + positionNum;
                            const isBooked = bookedSlots.has(slotNum);
                            const isSelected = selectedSlotNum === slotNum;

                            let stateClass = 'available';
                            if (isBooked) stateClass = 'booked';
                            if (isSelected) stateClass = 'selected';

                            return (
                              <button
                                key={slotNum}
                                className={`slot-box-team ${stateClass}`}
                                onClick={() => handleSelectSlot(slotNum, isBooked)}
                                disabled={isBooked}
                              >
                                P{positionNum} {isBooked ? '(Booked)' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky footer action panel */}
            <div className="slots-footer-panel">
              <div className="slots-footer-info" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>SELECTED SLOT</span>
                  <strong className="highlight-gold font-heading" style={{ fontSize: '0.9rem' }}>
                    {selectedSlotNum ? (
                      mode === 'Solo' ? `Slot #${selectedSlotNum}` : `Team ${Math.ceil(selectedSlotNum / teamSize)} - P${((selectedSlotNum - 1) % teamSize) + 1}`
                    ) : (
                      'None'
                    )}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>AVAILABLE BALANCE</span>
                  <strong className="highlight-gold font-heading" style={{ fontSize: '0.9rem' }}>
                    ₹{(user.wallet.deposit + user.wallet.winnings).toFixed(0)}
                  </strong>
                </div>
              </div>
              <button 
                className={`slots-confirm-btn ${(!selectedSlotNum || bookingSlot || (user.wallet.deposit + user.wallet.winnings) < match.entryFee) ? 'disabled' : ''}`}
                onClick={handleConfirmBooking}
                disabled={!selectedSlotNum || bookingSlot || (user.wallet.deposit + user.wallet.winnings) < match.entryFee}
                style={{ width: '100%', padding: '12px 16px' }}
              >
                {bookingSlot ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="spin-animate" /> Booking Slot...
                  </span>
                ) : (
                  `CONFIRM SLOT & BOOK (₹${match.entryFee})`
                )}
              </button>
            </div>
          </>
        )}

        {popupConfig && (
          <div className="custom-alert-overlay" style={{ zIndex: 3500 }}>
            <div className="custom-alert-box animated-scale-up" style={{ borderColor: 'var(--color-yellow-gold)', boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 20px rgba(245,158,11,0.25)' }}>
              <div className="custom-alert-header">
                {popupConfig.type === 'confirm' ? (
                  <Shield size={28} className="highlight-gold" />
                ) : popupConfig.title.toLowerCase().includes('fail') || popupConfig.title.toLowerCase().includes('error') || popupConfig.title.toLowerCase().includes('insufficient') ? (
                  <AlertCircle size={28} style={{ color: '#ef4444' }} />
                ) : (
                  <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
                )}
                <h4>{popupConfig.title}</h4>
              </div>
              <p className="custom-alert-message">{popupConfig.message}</p>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                {popupConfig.type === 'confirm' ? (
                  <>
                    <button 
                      type="button" 
                      className="custom-alert-btn" 
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', boxShadow: 'none', color: 'var(--color-text-light)' }}
                      onClick={() => {
                        if (popupConfig.onCancel) popupConfig.onCancel();
                        setPopupConfig(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="custom-alert-btn"
                      onClick={() => {
                        if (popupConfig.onConfirm) popupConfig.onConfirm();
                        setPopupConfig(null);
                      }}
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    type="button" 
                    className="custom-alert-btn"
                    onClick={() => {
                      if (popupConfig.onConfirm) popupConfig.onConfirm();
                      setPopupConfig(null);
                    }}
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Normal List rendering
  return (
    <div className="lobby-view-container">
      {/* Top Yellow Bar - Curved bottom */}
      <div className="lobby-header-bar curved-yellow-header">
        <button className="back-arrow-btn dark-icon" onClick={() => setView('play')} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <div className="lobby-header-title dark-title">
          <h3>Sky Arena</h3>
        </div>
        <div style={{ width: 22 }}></div>
      </div>

      {/* Lobby Sub-Tabs (Ongoing, Upcoming, Results) - Styled Italicized */}
      <div className="lobby-subtabs italic-tabs">
        <button 
          className={`subtab-btn ${activeSubTab === 'ongoing' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ongoing')}
        >
          Ongoing
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={`subtab-btn ${activeSubTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('results')}
        >
          Result
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="lobby-search-bar">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search tournaments..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Match Cards List */}
      <div className="lobby-matches-list">
        {filteredMatches.length === 0 ? (
          <div className="no-matches-fallback">
            <Shield size={36} className="text-muted-icon" />
            <p>No matches found in this category.</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const registered = isUserRegistered(match.matchId);
            const userReg = getUserRegistration(match.matchId);
            const percentFilled = (match.slots.joined / match.slots.total) * 100;
            
            // Calculate prize pool dynamically if not present
            const calculatedPrizePool = match.prizePool || 
              (match.entryFee * match.slots.total * (1 - match.hostCommissionPercent / 100));

            const gameBanner = match.game === 'freefire' ? '/img/freefire.avif' : '/img/bgmi.avif';

            // Check if player has registered, fetch their booked slot details
            const myBookedSlot = registrations.find(
              r => r.matchId === match.matchId && r.userId === user.id
            );

            const handleCardClick = async () => {
              if (match.status === 'Completed') {
                setSelectedMatchForResults(match);
                setLoadingResults(true);
                try {
                  await loadMatchRegistrations(match.matchId);
                } catch (error) {
                  console.error('Failed to load results registrations:', error);
                } finally {
                  setLoadingResults(false);
                }
              } else {
                setSelectedMatchForDetails(match);
              }
            };

            return (
              <div 
                className="match-card-block premium-white-card clickable-card" 
                key={match.matchId}
                onClick={handleCardClick}
              >
                
                {/* 1. Large Top Banner Image */}
                <div className="lobby-card-banner-wrapper">
                  <img src={gameBanner} alt={match.title} className="lobby-card-banner-img" />
                </div>

                {/* 2. Title and Subtitles (with Circular Game Icon/Avatar) */}
                <div className="lobby-card-organizer-row">
                  <img src={gameBanner} alt="Game Logo" className="lobby-card-avatar" />
                  <div className="lobby-card-details">
                    <h4 className="lobby-card-title">{match.title.toUpperCase()}</h4>
                    <span className="lobby-card-time">Time : {formatMatchTime(match.startTime)}</span>
                    <span className="lobby-card-by">
                      Organized By - <span className="highlight-red">{getOrganizerName(match.organizerId, match.organizerName)}</span>
                    </span>
                  </div>
                </div>

                {/* 3. Coin Rules Section (WIN PRIZE, PER KILL, ENTRY FEE) */}
                <div className="lobby-coin-grid">
                  <div className="lobby-coin-col">
                    <span className="lobby-coin-lbl">
                      WIN PRIZE <ChevronDown size={10} style={{ marginLeft: 2, display: 'inline' }} />
                    </span>
                    <div className="lobby-coin-pill">
                      <span className="lobby-coin-icon">C</span>
                      <span>{calculatedPrizePool.toFixed(0)}</span>
                    </div>
                  </div>
                  
                  <div className="lobby-coin-col">
                    <span className="lobby-coin-lbl">PER KILL</span>
                    <div className="lobby-coin-pill">
                      <span className="lobby-coin-icon">C</span>
                      <span>{match.prizeRules.type === 'PerKillAndPlacement' ? match.prizeRules.perKillPrize : '-'}</span>
                    </div>
                  </div>

                  <div className="lobby-coin-col">
                    <span className="lobby-coin-lbl">ENTRY FEE</span>
                    <div className="lobby-coin-pill">
                      <span className="lobby-coin-icon">C</span>
                      <span>{match.entryFee}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Specifications Grid (TYPE, MODE, MAP) */}
                <div className="lobby-spec-grid">
                  <div className="lobby-spec-col">
                    <span className="lobby-spec-lbl">TYPE</span>
                    <span className="lobby-spec-val">{match.mapType === 'ClashSquad' ? `CS (${match.clashSquadFormat})` : match.mode.toUpperCase()}</span>
                  </div>
                  <div className="lobby-spec-col">
                    <span className="lobby-spec-lbl">MODE</span>
                    <span className="lobby-spec-val">TPP</span>
                  </div>
                  <div className="lobby-spec-col">
                    <span className="lobby-spec-lbl">MAP</span>
                    <span className="lobby-spec-val">{match.mapType === 'ClashSquad' ? 'Clash Arena' : match.map}</span>
                  </div>
                </div>

                {/* 5. Divider Line */}
                <div className="lobby-card-divider"></div>

                {/* 6. Spots Progress Bar & Action Button (Flex Layout Row) */}
                {match.status !== 'Completed' ? (
                  <div className="lobby-card-bottom-row">
                    <div className="lobby-progress-left-block">
                      <div className="lobby-progress-bg">
                        <div className="lobby-progress-fill" style={{ width: `${percentFilled}%` }}></div>
                      </div>
                      <div className="lobby-progress-text-row">
                        <span className="lobby-progress-spots">
                          Only {match.slots.total - match.slots.joined} spots left
                        </span>
                        <span className="lobby-progress-count">
                          {match.slots.joined} / {match.slots.total}
                        </span>
                      </div>
                    </div>
                    
                    <div className="lobby-action-right-block">
                      {registered ? (
                        <button className="lobby-join-btn-outline joined" disabled onClick={(e) => e.stopPropagation()}>
                          {myBookedSlot?.slotNumber ? `#${myBookedSlot.slotNumber} BOOKED` : 'JOINED'}
                        </button>
                      ) : match.slots.joined >= match.slots.total ? (
                        <button className="lobby-join-btn-outline soldout" disabled onClick={(e) => e.stopPropagation()}>FULL</button>
                      ) : (
                        <button 
                          className="lobby-join-btn-outline" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenSlotSelector(match); 
                          }}
                        >
                          JOIN
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="lobby-card-bottom-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '0.72rem', fontWeight: 'bold' }}>
                      <CheckCircle size={14} style={{ flexShrink: 0 }} />
                      <span>MATCH COMPLETED</span>
                    </div>
                    <div className="lobby-action-right-block">
                      <button 
                        className="lobby-join-btn-outline" 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          setSelectedMatchForResults(match); 
                          setLoadingResults(true);
                          try {
                            await loadMatchRegistrations(match.matchId);
                          } catch (error) {
                            console.error('Failed to load results registrations:', error);
                          } finally {
                            setLoadingResults(false);
                          }
                        }}
                      >
                        VIEW RESULTS
                      </button>
                    </div>
                  </div>
                )}

                {/* Status-specific additions (e.g. Credentials / Live / Results) */}
                <div className="lobby-card-extra-info">
                  {/* Display Room Credentials if host has updated and player is registered */}
                  {activeSubTab === 'upcoming' && match.status === 'RoomReady' && registered && (
                    <div className="room-credentials-box dark-creds" onClick={(e) => e.stopPropagation()}>
                      <div className="room-creds-title">
                        <Key size={14} className="highlight-gold" />
                        <span>Room Details Received!</span>
                      </div>
                      <div className="room-creds-info">
                        <div>Room ID: <strong className="selectable-text">{match.roomDetails.roomId}</strong></div>
                        <div>Password: <strong className="selectable-text">{match.roomDetails.roomPass}</strong></div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Ongoing actions */}
                  {activeSubTab === 'ongoing' && (
                    <div className="live-status-container" style={{ marginTop: 8 }}>
                      <div className="live-badge-glow">
                        <span className="pulse-red-dot"></span>
                        <span>MATCH IS LIVE</span>
                      </div>
                      {registered && (
                        <p className="ongoing-spectate-text" style={{ color: '#64748b' }}>
                          Spectate or play room {match.roomDetails.roomId}. Results pending.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tab: Results leaderboard badge */}
                  {activeSubTab === 'results' && (
                    <div className="completed-results-summary" style={{ marginTop: 8 }}>
                      <div className="results-badge">
                        <Trophy size={14} className="highlight-gold" />
                        <span>Results Released</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {popupConfig && (
        <div className="custom-alert-overlay" style={{ zIndex: 3500 }}>
          <div className="custom-alert-box animated-scale-up" style={{ borderColor: 'var(--color-yellow-gold)', boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 20px rgba(245,158,11,0.25)' }}>
            <div className="custom-alert-header">
              {popupConfig.type === 'confirm' ? (
                <Shield size={28} className="highlight-gold" />
              ) : popupConfig.title.toLowerCase().includes('fail') || popupConfig.title.toLowerCase().includes('error') || popupConfig.title.toLowerCase().includes('insufficient') ? (
                <AlertCircle size={28} style={{ color: '#ef4444' }} />
              ) : (
                <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
              )}
              <h4>{popupConfig.title}</h4>
            </div>
            <p className="custom-alert-message">{popupConfig.message}</p>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {popupConfig.type === 'confirm' ? (
                <>
                  <button 
                    type="button" 
                    className="custom-alert-btn" 
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', boxShadow: 'none', color: 'var(--color-text-light)' }}
                    onClick={() => {
                      if (popupConfig.onCancel) popupConfig.onCancel();
                      setPopupConfig(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="custom-alert-btn"
                    onClick={() => {
                      if (popupConfig.onConfirm) popupConfig.onConfirm();
                      setPopupConfig(null);
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  className="custom-alert-btn"
                  onClick={() => {
                    if (popupConfig.onConfirm) popupConfig.onConfirm();
                    setPopupConfig(null);
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
