import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { ArrowLeft, MapPin, Users, Key, AlertCircle, ChevronRight } from 'lucide-react';

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

export default function MyMatchesView({ setView }) {
  const { user, matches, registrations } = useDB();
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, ongoing, completed

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

  // Get matches where current user is registered
  const getMyJoinedMatches = () => {
    const userRegs = registrations.filter(r => r.userId === user.id);
    const joinedMatchIds = userRegs.map(r => r.matchId);

    const filtered = matches.filter(m => {
      if (!joinedMatchIds.includes(m.matchId)) return false;

      if (activeTab === 'upcoming') {
        return m.status === 'Registering' || m.status === 'Full' || m.status === 'RoomReady';
      } else if (activeTab === 'ongoing') {
        return m.status === 'Live';
      } else if (activeTab === 'completed') {
        return m.status === 'Completed';
      }
      return false;
    });

    return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

  const myJoinedMatches = getMyJoinedMatches();

  // Helper to fetch user registration stats for a specific match
  const getMatchRegistrationDetails = (matchId) => {
    return registrations.find(r => r.matchId === matchId && r.userId === user.id);
  };

  return (
    <div className="my-matches-view-container" style={{ padding: '12px 14px' }}>
      {/* Yellow Navigation Header */}
      <div className="matches-header-bar">
        <button className="back-arrow-btn" onClick={() => setView('play')} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="matches-header-title">
          <h3>My Matches Center</h3>
          <span>Your tournament schedule</span>
        </div>
        <div style={{ width: 20 }}></div>
      </div>

      {/* Tab Switcher */}
      <div className="matches-subtabs" style={{ marginBottom: '16px' }}>
        <button 
          className={`subtab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
          onClick={() => setActiveTab('ongoing')}
        >
          Ongoing
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Matches Listing */}
      <div className="matches-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {myJoinedMatches.length === 0 ? (
          <div className="no-matches-fallback">
            <AlertCircle size={36} className="text-muted-icon" />
            <p>You haven't joined any {activeTab} matches yet.</p>
            <button className="find-matches-btn" onClick={() => setView('play')}>
              Find Tournaments
            </button>
          </div>
        ) : (
          myJoinedMatches.map((match) => {
            const userReg = getMatchRegistrationDetails(match.matchId);
            
            // Calculate prize pool dynamically if not present
            const calculatedPrizePool = match.prizePool || 
              (match.entryFee * match.slots.total * (1 - match.hostCommissionPercent / 100));

            const gameBanner = match.game === 'freefire' ? '/img/freefire.avif' : '/img/bgmi.avif';

            return (
              <div className="match-card-block premium-white-card" key={match.matchId}>
                {/* Banner Image */}
                <div className="lobby-card-banner-wrapper">
                  <img src={gameBanner} alt={match.title} className="lobby-card-banner-img" />
                </div>

                {/* Title & Organizer Row */}
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

                {/* Coin Grid */}
                <div className="lobby-coin-grid">
                  <div className="lobby-coin-col">
                    <span className="lobby-coin-lbl">WIN PRIZE <ChevronRight size={8} style={{ display: 'inline' }} /></span>
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

                {/* Specs Grid */}
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

                <div className="lobby-card-divider"></div>

                {/* Body details depending on status */}
                <div className="lobby-card-extra-info" style={{ padding: '0 14px 14px' }}>
                  
                  {/* Tab: Upcoming match details */}
                  {activeTab === 'upcoming' && (
                    <>
                      {match.status === 'RoomReady' ? (
                        <div className="credentials-alert-box dark-creds" style={{ margin: 0 }}>
                          <div className="creds-title">
                            <Key size={14} className="highlight-gold" />
                            <span>Room Code & Password Dispatched!</span>
                          </div>
                          <div className="creds-detail-row">
                            <div>Room ID: <strong className="selectable-text">{match.roomDetails.roomId}</strong></div>
                            <div>Password: <strong className="selectable-text">{match.roomDetails.roomPass}</strong></div>
                          </div>
                          <p className="creds-tip">Note: Copy and enter details in the Custom Room menu in-game before match starts.</p>
                        </div>
                      ) : (
                        <div className="status-waiting-box dark-theme-mini" style={{ margin: 0 }}>
                          <span className="spinner-dots" style={{ backgroundColor: '#64748b' }}></span>
                          <span style={{ color: '#64748b', fontWeight: 'bold' }}>Room ID and Password will be shown here before match starts</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tab: Ongoing details */}
                  {activeTab === 'ongoing' && (
                    <div className="ongoing-live-box" style={{ margin: 0 }}>
                      <span>
                        <span className="live-glow-dot"></span>
                        MATCH IN PROGRESS (LIVE)
                      </span>
                      <p style={{ color: '#16a34a' }}>Stay in the room lobby. Results will be uploaded manually by the organizer shortly after match finishes.</p>
                    </div>
                  )}

                  {/* Tab: Completed match details */}
                  {activeTab === 'completed' && userReg && (
                    <div className="completed-stats-card dark-theme-mini" style={{ margin: 0 }}>
                      <h5 style={{ color: '#64748b', fontWeight: 'bold' }}>Your Match Results:</h5>
                      <div className="stats-row" style={{ marginTop: '6px' }}>
                        <div className="stat-field">
                          <span className="lbl" style={{ color: '#64748b' }}>Kills</span>
                          <span className="val" style={{ color: '#0f172a' }}>{userReg.matchStats.kills}</span>
                        </div>
                        <div className="stat-field">
                          <span className="lbl" style={{ color: '#64748b' }}>Position</span>
                          <span className="val" style={{ color: '#0f172a' }}>
                            {userReg.matchStats.disqualified ? 'DQ' : `#${userReg.matchStats.position}`}
                          </span>
                        </div>
                        <div className="stat-field">
                          <span className="lbl" style={{ color: '#64748b' }}>Winnings</span>
                          <span className={`val ${userReg.matchStats.disqualified ? 'dq' : 'win'}`}>
                            {userReg.matchStats.disqualified ? (
                              '₹0'
                            ) : (
                              `₹${(userReg.matchStats.kills * match.prizeRules.perKillPrize + 
                              (userReg.matchStats.position === 1 ? (match.prizeRules.type === 'WinnerTakesAll' ? calculatedPrizePool : (match.prizeRules.placementSplit['1st'] || 0)) : 
                               userReg.matchStats.position === 2 ? (match.prizeRules.placementSplit['2nd'] || 0) : 
                               userReg.matchStats.position === 3 ? (match.prizeRules.placementSplit['3rd'] || 0) : 0)).toFixed(0)}`
                            )}
                          </span>
                        </div>
                      </div>
                      {userReg.matchStats.disqualified && (
                        <div className="dq-banner-reason" style={{ marginTop: '8px' }}>
                          <AlertCircle size={14} />
                          <span>Disqualified: {userReg.matchStats.disqualificationReason || 'Cheating / Emulator flag'}</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
