import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { 
  ArrowLeft, Plus, Shield, ShieldAlert, Users, Award, 
  Gamepad2, Calendar, Map, CheckCircle2, Play, Key, ChevronRight, RefreshCw
} from 'lucide-react';

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

export default function HostPanel({ onBack }) {
  const { 
    user, matches, registrations, transactions, createMatch, updateMatch,
    dispatchRoomDetails, setMatchLive, submitMatchupScore, 
    completeLeague, completeSingleMatch, cancelMatch, loadMatchRegistrations 
  } = useDB();

  const [activeTab, setActiveTab] = useState('list'); // list, create, manage, earnings
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  
  // Earnings states
  const [earningsTab, setEarningsTab] = useState('commissions'); // commissions, escrow, payouts

  // Filter all tournaments organized by this user
  const hostMatches = matches.filter(m => m.organizerId === user.id);

  // Completed matches hosted
  const completedHostMatches = hostMatches.filter(m => m.status === 'Completed');

  // Active/upcoming matches hosted
  const activeHostMatches = hostMatches.filter(m => 
    m.status === 'Registering' || m.status === 'Full' || m.status === 'RoomReady' || m.status === 'Live'
  );

  // Total commissions earned
  const totalCommissionsEarned = completedHostMatches.reduce((acc, m) => {
    const feeCollected = m.slots.joined * m.entryFee;
    const comm = feeCollected * ((m.hostCommissionPercent || 0) / 100);
    return acc + comm;
  }, 0);

  // Total escrow pool held
  const totalEscrowPool = activeHostMatches.reduce((acc, m) => {
    return acc + (m.slots.joined * m.entryFee);
  }, 0);

  // Potential host commission from active lobbies
  const potentialHostCommission = activeHostMatches.reduce((acc, m) => {
    const currentFeeCollected = m.slots.joined * m.entryFee;
    const comm = currentFeeCollected * ((m.hostCommissionPercent || 0) / 100);
    return acc + comm;
  }, 0);

  // Filter host commission transactions
  const hostCommissionTxns = transactions ? transactions
    .filter(tx => tx.userId === user.id && tx.type === 'OrganizerCommission')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];

  // Match creation form states
  const [newTitle, setNewTitle] = useState('');
  const [newGame, setNewGame] = useState('bgmi');
  const [newType, setNewType] = useState('SingleMatch'); // SingleMatch, League
  const [newMap, setNewMap] = useState('Erangel');
  const [newMode, setNewMode] = useState('Solo');
  const [newEntryFee, setNewEntryFee] = useState('20');
  const [newSlots, setNewSlots] = useState('50');
  const [newCommission, setNewCommission] = useState('10');
  const [newMapType, setNewMapType] = useState('BigMap'); // BigMap, ClashSquad
  const [clashSquadFormat, setClashSquadFormat] = useState('1v1'); // 1v1, 2v2, 4v4
  const [newRulesType, setNewRulesType] = useState('PerKillAndPlacement'); // PerKillAndPlacement, WinnerTakesAll, PlacementOnly
  const [perKillPrize, setPerKillPrize] = useState('5');
  const [placement1st, setPlacement1st] = useState('200');
  const [placement2nd, setPlacement2nd] = useState('100');
  const [placement3rd, setPlacement3rd] = useState('50');
  const [newStartTime, setNewStartTime] = useState(() => {
    const date = new Date(Date.now() + 1000 * 60 * 60 * 2);
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16);
  });

  // Room details form states
  const [roomId, setRoomId] = useState('');
  const [roomPass, setRoomPass] = useState('');

  // Standings list for single match completion
  const [standings, setStandings] = useState([]);

  // Roster lazy load state inside manage tab
  const [showParticipants, setShowParticipants] = useState(false);

  // Custom validation error states
  const [createErrors, setCreateErrors] = useState({});
  const [roomErrors, setRoomErrors] = useState({});
  const [standingsErrors, setStandingsErrors] = useState({});
  const [matchupErrors, setMatchupErrors] = useState({});

  // Cancellation states
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Loading states for async operations
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [dispatchingRoom, setDispatchingRoom] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [submittingStandings, setSubmittingStandings] = useState(false);
  const [cancelingMatch, setCancelingMatch] = useState(false);

  // Tournament editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGame, setEditGame] = useState('bgmi');
  const [editType, setEditType] = useState('SingleMatch');
  const [editMapType, setEditMapType] = useState('BigMap');
  const [editClashSquadFormat, setEditClashSquadFormat] = useState('1v1');
  const [editMap, setEditMap] = useState('');
  const [editMode, setEditMode] = useState('Solo');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEntryFee, setEditEntryFee] = useState('');
  const [editSlots, setEditSlots] = useState('');
  const [editCommission, setEditCommission] = useState('10');
  const [editRulesType, setEditRulesType] = useState('PerKillAndPlacement');
  const [editPerKillPrize, setEditPerKillPrize] = useState('0');
  const [editPlacement1st, setEditPlacement1st] = useState('0');
  const [editPlacement2nd, setEditPlacement2nd] = useState('0');
  const [editPlacement3rd, setEditPlacement3rd] = useState('0');
  const [updatingMatch, setUpdatingMatch] = useState(false);
  const [editErrors, setEditErrors] = useState({});

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

  // Matchup score edit state (Leagues)
  const [selectedMatchupId, setSelectedMatchupId] = useState(null);
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [team1Kills, setTeam1Kills] = useState('0');
  const [team2Kills, setTeam2Kills] = useState('0');
  const [team1Disq, setTeam1Disq] = useState(false);
  const [team2Disq, setTeam2Disq] = useState(false);

  const myMatches = matches
    .filter(m => m.organizerId === user.id && m.type !== 'League')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const currentMatch = matches.find(m => m.matchId === selectedMatchId);

  const getSlotsCount = () => {
    if (newMapType === 'ClashSquad') {
      if (clashSquadFormat === '1v1') return 2;
      if (clashSquadFormat === '2v2') return 4;
      if (clashSquadFormat === '4v4') return 8;
    }
    return newType === 'League' ? 4 : (parseInt(newSlots, 10) || 0);
  };

  const getTeamMode = () => {
    if (newMapType === 'ClashSquad') {
      if (clashSquadFormat === '1v1') return 'Solo';
      if (clashSquadFormat === '2v2') return 'Duo';
      if (clashSquadFormat === '4v4') return 'Squad';
    }
    return newMode;
  };

  const calculateTotalEscrow = () => {
    const fee = parseFloat(newEntryFee) || 0;
    const spots = getSlotsCount();
    return fee * spots;
  };

  const calculateNetPrizePool = () => {
    const totalEscrow = calculateTotalEscrow();
    const comm = parseFloat(newCommission) || 0;
    return totalEscrow * (1 - comm / 100);
  };

  const getRecommendedSplits = () => {
    const netPool = calculateNetPrizePool();
    const spots = getSlotsCount();
    
    if (newRulesType === 'PerKillAndPlacement') {
      const killPool = netPool * 0.5;
      const placementPool = netPool * 0.5;
      
      const recPerKill = spots > 0 ? Math.floor(killPool / spots) : 0;
      const rec1st = Math.floor(placementPool * 0.6);
      const rec2nd = Math.floor(placementPool * 0.3);
      const rec3rd = Math.floor(placementPool * 0.1);
      
      return {
        perKill: recPerKill,
        placement1st: rec1st,
        placement2nd: rec2nd,
        placement3rd: rec3rd
      };
    } else if (newRulesType === 'PlacementOnly') {
      const rec1st = Math.floor(netPool * 0.6);
      const rec2nd = Math.floor(netPool * 0.3);
      const rec3rd = Math.floor(netPool * 0.1);
      
      return {
        placement1st: rec1st,
        placement2nd: rec2nd,
        placement3rd: rec3rd
      };
    } else {
      return {
        placement1st: Math.floor(netPool)
      };
    }
  };

  const handleApplySuggestion = () => {
    const rec = getRecommendedSplits();
    if (newRulesType === 'PerKillAndPlacement') {
      setPerKillPrize(rec.perKill.toString());
      setPlacement1st(rec.placement1st.toString());
      setPlacement2nd(rec.placement2nd.toString());
      setPlacement3rd(rec.placement3rd.toString());
    } else if (newRulesType === 'PlacementOnly') {
      setPlacement1st(rec.placement1st.toString());
      setPlacement2nd(rec.placement2nd.toString());
      setPlacement3rd(rec.placement3rd.toString());
    }
  };

  const getEditSlotsCount = () => {
    if (editMapType === 'ClashSquad') {
      if (editClashSquadFormat === '1v1') return 2;
      if (editClashSquadFormat === '2v2') return 4;
      if (editClashSquadFormat === '4v4') return 8;
    }
    return editType === 'League' ? 4 : (parseInt(editSlots, 10) || 0);
  };

  const getEditTeamMode = () => {
    if (editMapType === 'ClashSquad') {
      if (editClashSquadFormat === '1v1') return 'Solo';
      if (editClashSquadFormat === '2v2') return 'Duo';
      if (editClashSquadFormat === '4v4') return 'Squad';
    }
    return editMode;
  };

  const calculateEditTotalEscrow = () => {
    const fee = parseFloat(editEntryFee) || 0;
    const spots = getEditSlotsCount();
    return fee * spots;
  };

  const calculateEditNetPrizePool = () => {
    const totalEscrow = calculateEditTotalEscrow();
    const comm = parseFloat(editCommission) || 0;
    return totalEscrow * (1 - comm / 100);
  };

  const getEditRecommendedSplits = () => {
    const netPool = calculateEditNetPrizePool();
    const spots = getEditSlotsCount();
    
    if (editRulesType === 'PerKillAndPlacement') {
      const killPool = netPool * 0.5;
      const placementPool = netPool * 0.5;
      
      const recPerKill = spots > 0 ? Math.floor(killPool / spots) : 0;
      const rec1st = Math.floor(placementPool * 0.6);
      const rec2nd = Math.floor(placementPool * 0.3);
      const rec3rd = Math.floor(placementPool * 0.1);
      
      return {
        perKill: recPerKill,
        placement1st: rec1st,
        placement2nd: rec2nd,
        placement3rd: rec3rd
      };
    } else if (editRulesType === 'PlacementOnly') {
      const rec1st = Math.floor(netPool * 0.6);
      const rec2nd = Math.floor(netPool * 0.3);
      const rec3rd = Math.floor(netPool * 0.1);
      return {
        perKill: 0,
        placement1st: rec1st,
        placement2nd: rec2nd,
        placement3rd: rec3rd
      };
    } else {
      return {
        perKill: 0,
        placement1st: Math.floor(netPool),
        placement2nd: 0,
        placement3rd: 0
      };
    }
  };

  const handleApplyEditSuggestion = () => {
    const rec = getEditRecommendedSplits();
    if (editRulesType === 'PerKillAndPlacement') {
      setEditPerKillPrize(rec.perKill.toString());
      setEditPlacement1st(rec.placement1st.toString());
      setEditPlacement2nd(rec.placement2nd.toString());
      setEditPlacement3rd(rec.placement3rd.toString());
    } else if (editRulesType === 'PlacementOnly') {
      setEditPerKillPrize('0');
      setEditPlacement1st(rec.placement1st.toString());
      setEditPlacement2nd(rec.placement2nd.toString());
      setEditPlacement3rd(rec.placement3rd.toString());
    }
  };

  // Initialize scorecard when managing a live match
  const handleSelectMatchToManage = async (matchId) => {
    setSelectedMatchId(matchId);
    setActiveTab('manage');
    setShowParticipants(false);
    
    const registeredPlayers = await loadMatchRegistrations(matchId);
    
    const target = matches.find(m => m.matchId === matchId);
    if (target && target.type === 'SingleMatch') {
      // Map to default input fields
      const initialStandings = registeredPlayers.map(p => ({
        userId: p.userId,
        fullName: p.teamName,
        characterId: p.inGameCharacterId,
        slotNumber: p.slotNumber,
        kills: 0,
        position: 1,
        disqualified: false,
        reason: ''
      }));
      setStandings(initialStandings);
    }
    // Reset room/score states
    setRoomId('');
    setRoomPass('');
    setSelectedMatchupId(null);
    setTeam1Score('');
    setTeam2Score('');
    setTeam1Kills('0');
    setTeam2Kills('0');
    setTeam1Disq(false);
    setTeam2Disq(false);
    
    // Clear validation error states
    setCreateErrors({});
    setRoomErrors({});
    setStandingsErrors({});
    setMatchupErrors({});
    setCancelReason('');
    setCancelError('');

    // Pre-populate edit states if match exists
    if (target) {
      setEditTitle(target.title);
      setEditGame(target.game);
      setEditType(target.type);
      setEditMapType(target.mapType || 'BigMap');
      setEditClashSquadFormat(target.clashSquadFormat || '1v1');
      setEditMap(target.map);
      setEditMode(target.mode);
      try {
        const date = new Date(target.startTime);
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        setEditStartTime(adjustedDate.toISOString().slice(0, 16));
      } catch (e) {
        setEditStartTime('');
      }
      setEditEntryFee(target.entryFee.toString());
      setEditSlots(target.slots.total.toString());
      setEditCommission((target.hostCommissionPercent || 0).toString());
      setEditRulesType(target.prizeRules?.type || 'WinnerTakesAll');
      setEditPerKillPrize((target.prizeRules?.perKillPrize || 0).toString());
      setEditPlacement1st((target.prizeRules?.placementSplit?.['1st'] || 0).toString());
      setEditPlacement2nd((target.prizeRules?.placementSplit?.['2nd'] || 0).toString());
      setEditPlacement3rd((target.prizeRules?.placementSplit?.['3rd'] || 0).toString());
      setIsEditing(false);
      setEditErrors({});
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editTitle.trim()) errs.title = 'Title is required';
    if (!editStartTime) errs.startTime = 'Start time is required';
    
    if (!editEntryFee.trim() || isNaN(editEntryFee) || parseFloat(editEntryFee) < 0) {
      errs.entryFee = 'Invalid entry fee';
    }

    const activeJoined = currentMatch.slots.joined;
    const isCSOrLeague = editMapType === 'ClashSquad' || editType === 'League';
    if (!isCSOrLeague) {
      if (!editSlots.trim() || isNaN(editSlots) || parseInt(editSlots, 10) < activeJoined) {
        errs.slots = `Slots must be at least ${activeJoined}`;
      }
    }

    if (parseFloat(editCommission) < 0 || parseFloat(editCommission) > 25) {
      errs.commission = 'Host commission must be between 0% and 25%';
    }

    if (editRulesType === 'PerKillAndPlacement') {
      if (!editPerKillPrize.trim() || isNaN(editPerKillPrize) || parseFloat(editPerKillPrize) < 0) {
        errs.perKillPrize = 'Invalid reward per kill';
      }
    }
    if (editRulesType !== 'WinnerTakesAll') {
      if (!editPlacement1st.trim() || isNaN(editPlacement1st) || parseFloat(editPlacement1st) < 0) {
        errs.placement1st = '1st position split is required';
      }
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    setUpdatingMatch(true);

    try {
      const placementSplit = {};
      if (editRulesType === 'WinnerTakesAll') {
        placementSplit['1st'] = 100;
      } else {
        placementSplit['1st'] = parseFloat(editPlacement1st) || 0;
        placementSplit['2nd'] = parseFloat(editPlacement2nd) || 0;
        placementSplit['3rd'] = parseFloat(editPlacement3rd) || 0;
      }

      const prizeRules = {
        type: editRulesType,
        perKillPrize: editRulesType === 'PerKillAndPlacement' ? (parseFloat(editPerKillPrize) || 0) : 0,
        placementSplit
      };

      const finalSlots = editMapType === 'ClashSquad' 
        ? (editClashSquadFormat === '1v1' ? 2 : editClashSquadFormat === '2v2' ? 4 : 8)
        : (editType === 'League' ? 4 : parseInt(editSlots, 10));

      const finalMode = editMapType === 'ClashSquad'
        ? (editClashSquadFormat === '1v1' ? 'Solo' : editClashSquadFormat === '2v2' ? 'Duo' : 'Squad')
        : editMode;

      const editData = {
        title: editTitle,
        game: editGame,
        type: editType,
        map: editMapType === 'ClashSquad' ? 'Clash Arena' : editMap,
        mapType: editMapType,
        clashSquadFormat: editMapType === 'ClashSquad' ? editClashSquadFormat : 'N/A',
        mode: finalMode,
        startTime: new Date(editStartTime).toISOString(),
        entryFee: parseFloat(editEntryFee),
        hostCommissionPercent: parseFloat(editCommission),
        prizeRules,
        totalSlots: finalSlots
      };

      const success = await updateMatch(currentMatch.matchId, editData);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingMatch(false);
    }
  };

  const handleGameChange = (game) => {
    setNewGame(game);
    if (game === 'bgmi') {
      setNewMap('Erangel');
    } else {
      setNewMap('Bermuda');
    }
  };

  // Submit match creation
  const handleCreateMatchSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newTitle.trim()) {
      errs.title = 'Tournament title is required';
    }
    if (!newEntryFee.trim()) {
      errs.entryFee = 'Entry fee is required';
    } else if (isNaN(newEntryFee) || parseFloat(newEntryFee) < 0) {
      errs.entryFee = 'Please enter a valid entry fee (min 0)';
    }
    if (newType !== 'League' && newMapType !== 'ClashSquad') {
      if (!newSlots.trim()) {
        errs.slots = 'Total spots is required';
      } else if (isNaN(newSlots) || parseInt(newSlots, 10) < 2) {
        errs.slots = 'Total spots must be at least 2';
      }
    }
    if (newRulesType === 'PerKillAndPlacement') {
      if (!perKillPrize.trim()) {
        errs.perKillPrize = 'Reward per kill is required';
      } else if (isNaN(perKillPrize) || parseFloat(perKillPrize) < 0) {
        errs.perKillPrize = 'Please enter a valid reward per kill';
      }
    }
    if (newRulesType !== 'WinnerTakesAll') {
      if (!placement1st.trim()) {
        errs.placement1st = '1st position reward is required';
      } else if (isNaN(placement1st) || parseFloat(placement1st) < 0) {
        errs.placement1st = 'Please enter a valid amount';
      }
    }
    if (!newStartTime) {
      errs.startTime = 'Start time is required';
    }
    if (parseFloat(newCommission) < 0 || parseFloat(newCommission) > 25) {
      errs.commission = 'Host commission must be between 0% and 25%';
    }

    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }
    setCreateErrors({});
    setCreatingMatch(true);

    try {
      const placementSplit = {};
      if (newRulesType === 'WinnerTakesAll') {
        placementSplit['1st'] = 100; // placeholder representation
      } else {
        placementSplit['1st'] = parseFloat(placement1st) || 0;
        placementSplit['2nd'] = parseFloat(placement2nd) || 0;
        placementSplit['3rd'] = parseFloat(placement3rd) || 0;
      }

      const prizeRules = {
        type: newRulesType,
        perKillPrize: newRulesType === 'PerKillAndPlacement' ? (parseFloat(perKillPrize) || 0) : 0,
        placementSplit
      };

      const slotsClamped = getSlotsCount();

      const matchData = {
        title: newTitle || `${newGame.toUpperCase()} ${newType === 'League' ? 'League' : 'Match'} Cup`,
        game: newGame,
        type: newType,
        map: newMapType === 'ClashSquad' ? 'Clash Arena' : newMap,
        mapType: newMapType,
        clashSquadFormat: newMapType === 'ClashSquad' ? clashSquadFormat : 'N/A',
        mode: getTeamMode(),
        startTime: new Date(newStartTime).toISOString(),
        entryFee: parseFloat(newEntryFee),
        hostCommissionPercent: parseFloat(newCommission),
        prizeRules,
        totalSlots: slotsClamped
      };

      const success = await createMatch(matchData);
      if (success) {
        alert(`Tournament created successfully! ${newType === 'League' ? 'Slots set to 4 (Semifinals bracket configuration).' : ''}`);
        setNewTitle('');
        setNewMapType('BigMap');
        setClashSquadFormat('1v1');
        setActiveTab('list');
      }
    } catch (error) {
      console.error('Create match error:', error);
      alert('Failed to create tournament.');
    } finally {
      setCreatingMatch(false);
    }
  };

  // Dispatch Room Credentials
  const handleDispatchRoom = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!roomId.trim()) {
      errs.roomId = 'Room ID is required';
    }
    if (!roomPass.trim()) {
      errs.roomPass = 'Room Password is required';
    }
    if (Object.keys(errs).length > 0) {
      setRoomErrors(errs);
      return;
    }
    setRoomErrors({});
    setDispatchingRoom(true);

    try {
      await dispatchRoomDetails(currentMatch.matchId, roomId, roomPass);
    } catch (error) {
      console.error(error);
    } finally {
      setDispatchingRoom(false);
    }
  };

  // Switch to live
  const handleStartLive = async () => {
    setStartingLive(true);
    try {
      await setMatchLive(currentMatch.matchId);
    } catch (error) {
      console.error(error);
    } finally {
      setStartingLive(false);
    }
  };

  // Single Match Standings submission
  const handleSingleStandingsChange = (index, field, value) => {
    const updated = [...standings];
    updated[index][field] = value;
    setStandings(updated);

    const userId = updated[index].userId;
    const errKey = `${userId}_${field}`;
    setStandingsErrors(prev => {
      const next = { ...prev };
      delete next[errKey];
      if (field === 'disqualified') {
        if (value) {
          delete next[`${userId}_position`];
        } else {
          delete next[`${userId}_reason`];
        }
      }
      return next;
    });
  };

  const handleSingleStandingsSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    standings.forEach(s => {
      if (s.kills === undefined || s.kills === null || s.kills.toString().trim() === '') {
        errs[`${s.userId}_kills`] = 'Kills is required';
      } else if (isNaN(s.kills) || parseInt(s.kills, 10) < 0) {
        errs[`${s.userId}_kills`] = 'Invalid kills';
      }

      if (!s.disqualified) {
        if (s.position === undefined || s.position === null || s.position.toString().trim() === '') {
          errs[`${s.userId}_position`] = 'Position is required';
        } else if (isNaN(s.position) || parseInt(s.position, 10) < 1) {
          errs[`${s.userId}_position`] = 'Invalid position';
        }
      } else {
        if (!s.reason || !s.reason.trim()) {
          errs[`${s.userId}_reason`] = 'Reason is required';
        }
      }
    });

    if (Object.keys(errs).length > 0) {
      setStandingsErrors(errs);
      return;
    }
    setStandingsErrors({});

    // Validate standings placements depending on mode
    const activeStandings = standings.filter(s => !s.disqualified);
    const mode = currentMatch?.mode || 'Solo';
    const teamSize = mode === 'Duo' ? 2 : mode === 'Squad' ? 4 : 1;

    if (mode === 'Solo') {
      const placements = activeStandings.map(s => parseInt(s.position, 10));
      const uniquePlacements = new Set(placements);
      if (placements.length !== uniquePlacements.size) {
        alert('Error: Dual placement ranking detected. Each non-disqualified player must have a unique position (e.g. 1st, 2nd, 3rd).');
        return;
      }
    } else {
      // For Duo/Squad: Teammates must have the same position, different teams must have different positions
      const teamPlacements = {};
      for (const player of activeStandings) {
        const teamNum = Math.ceil((player.slotNumber || 0) / teamSize);
        const pos = parseInt(player.position, 10);
        
        if (teamPlacements[teamNum] !== undefined && teamPlacements[teamNum] !== pos) {
          alert(`Error: Teammates must have the same position! In Team ${teamNum}, players have mismatching positions.`);
          return;
        }
        teamPlacements[teamNum] = pos;
      }

      const uniqueTeamsPlacements = Object.values(teamPlacements);
      const uniquePlacementsSet = new Set(uniqueTeamsPlacements);
      if (uniqueTeamsPlacements.length !== uniquePlacementsSet.size) {
        alert('Error: Dual placement ranking detected. Each team must have a unique position (e.g. Team 1 in 1st, Team 2 in 2nd).');
        return;
      }
    }

    setSubmittingStandings(true);
    try {
      const success = await completeSingleMatch(currentMatch.matchId, standings);
      if (success) {
        setActiveTab('list');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingStandings(false);
    }
  };

  // League Matchup score submission
  const handleMatchupClick = (matchup) => {
    if (matchup.status === 'Completed') return;
    setSelectedMatchupId(matchup.matchupId);
    setTeam1Score('');
    setTeam2Score('');
    setTeam1Kills('0');
    setTeam2Kills('0');
    setTeam1Disq(false);
    setTeam2Disq(false);
    setMatchupErrors({});
  };

  const validateMatchup = () => {
    const errs = {};
    if (team1Score === undefined || team1Score === null || team1Score.toString().trim() === '') {
      errs.team1Score = 'Score is required';
    } else if (isNaN(team1Score) || parseFloat(team1Score) < 0) {
      errs.team1Score = 'Invalid score';
    }
    if (team1Kills === undefined || team1Kills === null || team1Kills.toString().trim() === '') {
      errs.team1Kills = 'Kills is required';
    } else if (isNaN(team1Kills) || parseInt(team1Kills, 10) < 0) {
      errs.team1Kills = 'Invalid kills';
    }

    if (team2Score === undefined || team2Score === null || team2Score.toString().trim() === '') {
      errs.team2Score = 'Score is required';
    } else if (isNaN(team2Score) || parseFloat(team2Score) < 0) {
      errs.team2Score = 'Invalid score';
    }
    if (team2Kills === undefined || team2Kills === null || team2Kills.toString().trim() === '') {
      errs.team2Kills = 'Kills is required';
    } else if (isNaN(team2Kills) || parseInt(team2Kills, 10) < 0) {
      errs.team2Kills = 'Invalid kills';
    }
    return errs;
  };

  const handleMatchupSubmit = (e) => {
    e.preventDefault();
    const errs = validateMatchup();
    if (Object.keys(errs).length > 0) {
      setMatchupErrors(errs);
      return;
    }
    setMatchupErrors({});

    submitMatchupScore(
      currentMatch.matchId,
      selectedMatchupId,
      team1Score,
      team2Score,
      team1Kills,
      team2Kills,
      team1Disq,
      team2Disq
    );

    alert('Matchup updated! Bracket advanced.');
    setSelectedMatchupId(null);
  };

  // League Finals Payout completion
  const handleLeagueFinalsSubmit = (e) => {
    e.preventDefault();
    const errs = validateMatchup();
    if (Object.keys(errs).length > 0) {
      setMatchupErrors(errs);
      return;
    }
    setMatchupErrors({});

    completeLeague(
      currentMatch.matchId,
      team1Score,
      team2Score,
      team1Kills,
      team2Kills,
      team1Disq,
      team2Disq
    );

    alert('League finals computed! Commission deposited and payouts released. Tournament Completed.');
    setActiveTab('list');
  };

  const handleCancelTournamentSubmit = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Cancellation reason is required.');
      return;
    }
    setCancelError('');
    setShowCancelConfirm(true);
  };

  const executeCancellation = async () => {
    setShowCancelConfirm(false);
    setCancelingMatch(true);
    try {
      const res = await cancelMatch(currentMatch.matchId, cancelReason.trim());
      alert(res.message);
      if (res.success) {
        setCancelReason('');
        setActiveTab('list');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to cancel tournament.');
    } finally {
      setCancelingMatch(false);
    }
  };

  return (
    <div className="host-panel-container">
      {/* Yellow Navigation Header */}
      <div className="host-header-bar">
        <button className="back-arrow-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="host-header-title">
          <h3>Organizer Dashboard</h3>
          <span>Manage escrow tournaments</span>
        </div>
        <div style={{ width: 20 }}></div>
      </div>

      {/* Subtab Switches */}
      <div className="host-subtabs">
        <button 
          className={`subtab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          My Tournaments
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Lobbies
        </button>
        <button 
          className={`subtab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          Earnings
        </button>
      </div>

      {/* 1. Lobbies List view */}
      {activeTab === 'list' && (
        <div className="host-matches-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 4px' }}>
          {myMatches.length === 0 ? (
            <div className="no-created-matches">
              <ShieldAlert size={36} className="highlight-gold" />
              <p>You haven't created any tournaments yet. Click "Create Lobbies" to spawn a match.</p>
            </div>
          ) : (
            myMatches.map(match => {
              const percentFilled = (match.slots.joined / match.slots.total) * 100;
              const calculatedPrizePool = match.prizePool || 
                (match.entryFee * match.slots.total * (1 - match.hostCommissionPercent / 100));
              const gameBanner = match.game === 'freefire' ? '/img/freefire.avif' : '/img/bgmi.avif';

              return (
                <div 
                  className="match-card-block premium-white-card clickable-card" 
                  key={match.matchId}
                  onClick={() => handleSelectMatchToManage(match.matchId)}
                >
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

                  {/* Spots & Manage Button */}
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
                      <button 
                        className={`lobby-join-btn-outline ${match.status === 'Live' ? 'live' : match.status === 'Completed' ? 'completed' : match.status === 'Cancelled' ? 'cancelled' : ''}`} 
                        onClick={(e) => { e.stopPropagation(); handleSelectMatchToManage(match.matchId); }}
                      >
                        {match.status === 'Completed' ? 'COMPLETED' : match.status === 'Live' ? 'LIVE' : match.status === 'Cancelled' ? 'CANCELLED' : 'MANAGE'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Create Tournament View */}
      {activeTab === 'create' && (
        <form className="host-create-form" noValidate onSubmit={handleCreateMatchSubmit}>
          
          <div className="form-group">
            <label>Tournament Title</label>
            <input 
              type="text" 
              placeholder="e.g. Squad Erangel Scrims" 
              value={newTitle}
              onChange={(e) => { setNewTitle(e.target.value); if (createErrors.title) setCreateErrors(prev => ({ ...prev, title: null })); }}
              style={{ border: createErrors.title ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
            />
            {createErrors.title && <span className="custom-input-error">{createErrors.title}</span>}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Match Format</label>
              <select value={newMapType} onChange={(e) => {
                const val = e.target.value;
                setNewMapType(val);
                setNewTitle('');
                if (val === 'ClashSquad') {
                  setNewRulesType('WinnerTakesAll');
                }
              }}>
                <option value="BigMap">Big Map (Standard)</option>
                <option value="ClashSquad">Clash Squad (Round Matchup)</option>
              </select>
            </div>
            {newMapType === 'ClashSquad' && (
              <div className="form-group flex-1">
                <label>Clash Squad Size</label>
                <select value={clashSquadFormat} onChange={(e) => setClashSquadFormat(e.target.value)}>
                  <option value="1v1">1v1 (2 players)</option>
                  <option value="2v2">2v2 (4 players)</option>
                  <option value="4v4">4v4 (8 players)</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Select Game</label>
              <select value={newGame} onChange={(e) => handleGameChange(e.target.value)}>
                <option value="bgmi">BGMI</option>
                <option value="freefire">Free Fire Max</option>
              </select>
            </div>
            
            <div className="form-group flex-1">
              <label>Match Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="SingleMatch">Single Match Lobby</option>
                <option value="League" disabled>League Bracket (Coming Soon)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Map</label>
              {newMapType === 'ClashSquad' ? (
                <input type="text" value="Clash Arena" disabled className="disabled-input" />
              ) : (
                <select value={newMap} onChange={(e) => setNewMap(e.target.value)}>
                  {newGame === 'bgmi' ? (
                    <>
                      <option value="Erangel">Erangel</option>
                      <option value="Miramar">Miramar</option>
                      <option value="Sanhok">Sanhok</option>
                      <option value="Vikendi">Vikendi</option>
                      <option value="Karakin">Karakin</option>
                    </>
                  ) : (
                    <>
                      <option value="Bermuda">Bermuda</option>
                      <option value="Purgatory">Purgatory</option>
                      <option value="Kalahari">Kalahari</option>
                      <option value="Alpine">Alpine</option>
                      <option value="NeXTerra">NeXTerra</option>
                    </>
                  )}
                </select>
              )}
            </div>
            
            <div className="form-group flex-1">
              <label>Team Mode</label>
              {newMapType === 'ClashSquad' ? (
                <input type="text" value={getTeamMode()} disabled className="disabled-input" />
              ) : (
                <select value={newMode} onChange={(e) => setNewMode(e.target.value)}>
                  <option value="Solo">Solo</option>
                  <option value="Duo">Duo</option>
                  <option value="Squad">Squad</option>
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Start Time</label>
            <input 
              type="datetime-local" 
              value={newStartTime}
              onChange={(e) => { setNewStartTime(e.target.value); if (createErrors.startTime) setCreateErrors(prev => ({ ...prev, startTime: null })); }}
              style={{ border: createErrors.startTime ? '1px solid #ef4444' : '1px solid var(--color-border)', color: 'white', backgroundColor: '#071120', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
            />
            {createErrors.startTime && <span className="custom-input-error">{createErrors.startTime}</span>}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Entry Fee (₹)</label>
              <input 
                type="number" 
                value={newEntryFee}
                onChange={(e) => { setNewEntryFee(e.target.value); if (createErrors.entryFee) setCreateErrors(prev => ({ ...prev, entryFee: null })); }}
                style={{ border: createErrors.entryFee ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
              />
              {createErrors.entryFee && <span className="custom-input-error">{createErrors.entryFee}</span>}
            </div>

            <div className="form-group flex-1">
              <label>Total Spots</label>
              {newMapType === 'ClashSquad' ? (
                <input type="text" value={`${getSlotsCount()} spots (Locked)`} disabled className="disabled-input" />
              ) : newType === 'League' ? (
                <input type="text" value="4 (Semifinals clamped)" disabled className="disabled-input" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input 
                    type="number" 
                    value={newSlots}
                    onChange={(e) => { setNewSlots(e.target.value); if (createErrors.slots) setCreateErrors(prev => ({ ...prev, slots: null })); }}
                    style={{ border: createErrors.slots ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                  />
                  {createErrors.slots && <span className="custom-input-error">{createErrors.slots}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Host Commission Rate (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="range" 
                min="0" 
                max="25" 
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <span className="comm-val highlight-gold">{newCommission}%</span>
            </div>
            <span className="comm-help">SkyArena rules clamp commission between 0% to 25% of the total escrow pool.</span>
          </div>

          {/* Prize Splits Configurations */}
          <div className="prize-rules-section">
            <h5>Payout & Splits Ruleset</h5>

            <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Total Escrow Pool:</span>
                <strong className="highlight-gold">₹{calculateTotalEscrow().toFixed(0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Host Commission ({newCommission}%):</span>
                <strong className="highlight-gold">₹{(calculateTotalEscrow() * (parseFloat(newCommission) || 0) / 100).toFixed(0)}</strong>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 'bold' }}>
                <span style={{ color: 'white' }}>Net Reward Pool to Distribute:</span>
                <span className="highlight-emerald" style={{ color: 'var(--color-success)' }}>₹{calculateNetPrizePool().toFixed(0)}</span>
              </div>
              
              <div style={{ marginTop: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', fontSize: '0.68rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-yellow-gold)' }}>💡 Suggestion:</span>
                  {newRulesType === 'PerKillAndPlacement' && ` Per Kill: ₹${getRecommendedSplits().perKill} | 1st: ₹${getRecommendedSplits().placement1st} | 2nd: ₹${getRecommendedSplits().placement2nd} | 3rd: ₹${getRecommendedSplits().placement3rd}`}
                  {newRulesType === 'PlacementOnly' && ` 1st: ₹${getRecommendedSplits().placement1st} | 2nd: ₹${getRecommendedSplits().placement2nd} | 3rd: ₹${getRecommendedSplits().placement3rd}`}
                  {newRulesType === 'WinnerTakesAll' && ` 1st: ₹${getRecommendedSplits().placement1st} (100% Split)`}
                </div>
                {newRulesType !== 'WinnerTakesAll' && (
                  <button
                    type="button"
                    onClick={handleApplySuggestion}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
                  >
                    Apply Suggestion
                  </button>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label>Distribution Law</label>
              {newMapType === 'ClashSquad' ? (
                <input type="text" value="Winner Takes All (100% split)" disabled className="disabled-input" />
              ) : (
                <select value={newRulesType} onChange={(e) => setNewRulesType(e.target.value)}>
                  <option value="PerKillAndPlacement">Per Kill + Placement Splits</option>
                  <option value="PlacementOnly">Placement Splits Only</option>
                  <option value="WinnerTakesAll">Winner Takes All (100% split)</option>
                </select>
              )}
              {newRulesType === 'WinnerTakesAll' && (
                <span className="comm-help" style={{ color: 'var(--color-primary)', display: 'block', marginTop: '6px', fontSize: '0.68rem', lineHeight: '1.3' }}>
                  Note: 1st position gets the full reward. For team modes (Duo/Squad), the reward is split equally among all winning team members.
                </span>
              )}
            </div>

            {newRulesType === 'PerKillAndPlacement' && (
              <div className="form-group">
                <label>Reward per Kill (₹)</label>
                <input 
                  type="number" 
                  value={perKillPrize}
                  onChange={(e) => { setPerKillPrize(e.target.value); if (createErrors.perKillPrize) setCreateErrors(prev => ({ ...prev, perKillPrize: null })); }}
                  style={{ border: createErrors.perKillPrize ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                />
                {createErrors.perKillPrize && <span className="custom-input-error">{createErrors.perKillPrize}</span>}
              </div>
            )}

            {newRulesType !== 'WinnerTakesAll' && (
              <div className="form-row">
                <div className="form-group flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label>1st Position (₹)</label>
                  <input 
                    type="number" 
                    value={placement1st}
                    onChange={(e) => { setPlacement1st(e.target.value); if (createErrors.placement1st) setCreateErrors(prev => ({ ...prev, placement1st: null })); }}
                    style={{ border: createErrors.placement1st ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                  />
                  {createErrors.placement1st && <span className="custom-input-error">{createErrors.placement1st}</span>}
                </div>
                <div className="form-group flex-1">
                  <label>2nd Position (₹)</label>
                  <input 
                    type="number" 
                    value={placement2nd}
                    onChange={(e) => setPlacement2nd(e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>3rd Position (₹)</label>
                  <input 
                    type="number" 
                    value={placement3rd}
                    onChange={(e) => setPlacement3rd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="host-submit-create-btn" disabled={creatingMatch}>
            {creatingMatch ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="spin-animate" /> Creating...
              </span>
            ) : (
              'Create Lobbies & Deposit Escrow'
            )}
          </button>
        </form>
      )}

      {/* Earnings Dashboard Tab */}
      {activeTab === 'earnings' && (
        <div className="host-earnings-panel" style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Metrics Summary Cards Grid */}
          <div className="earnings-stats-grid">
            <div className="earnings-stat-card">
              <span className="card-metric-label">TOTAL EARNINGS</span>
              <h3 className="card-metric-value highlight-emerald">₹{totalCommissionsEarned.toFixed(0)}</h3>
              <span className="card-metric-desc">Commission released to winnings</span>
            </div>
            
            <div className="earnings-stat-card">
              <span className="card-metric-label">ESCROW HELD</span>
              <h3 className="card-metric-value highlight-gold">₹{totalEscrowPool.toFixed(0)}</h3>
              <span className="card-metric-desc">Active lobbies registration stakes</span>
            </div>

            <div className="earnings-stat-card">
              <span className="card-metric-label">POTENTIAL COMMISSION</span>
              <h3 className="card-metric-value highlight-blue">₹{potentialHostCommission.toFixed(0)}</h3>
              <span className="card-metric-desc">Expected host cut from active matches</span>
            </div>

            <div className="earnings-stat-card">
              <span className="card-metric-label">TOTAL HOSTED</span>
              <h3 className="card-metric-value">{hostMatches.length}</h3>
              <span className="card-metric-desc">Tournaments organized in total</span>
            </div>
          </div>

          {/* 2. Earnings Inner Toggle Navigation Bar */}
          <div className="earnings-inner-nav">
            <button 
              className={`inner-nav-btn ${earningsTab === 'commissions' ? 'active' : ''}`}
              onClick={() => setEarningsTab('commissions')}
            >
              Commissions List
            </button>
            <button 
              className={`inner-nav-btn ${earningsTab === 'escrow' ? 'active' : ''}`}
              onClick={() => setEarningsTab('escrow')}
            >
              Ongoing Escrow
            </button>
            <button 
              className={`inner-nav-btn ${earningsTab === 'payouts' ? 'active' : ''}`}
              onClick={() => setEarningsTab('payouts')}
            >
              Payout Ledger
            </button>
          </div>

          {/* 3. Sub-views Content */}
          <div className="earnings-view-content">
            
            {/* 3.1 Commissions List (Completed Tournaments) */}
            {earningsTab === 'commissions' && (
              <div className="earnings-table-container">
                {completedHostMatches.length === 0 ? (
                  <div className="earnings-empty-state">
                    <p>No completed tournaments yet. When you complete standing scorecards, commissions are credited here.</p>
                  </div>
                ) : (
                  <table className="earnings-table">
                    <thead>
                      <tr>
                        <th>Lobby Name</th>
                        <th>Date</th>
                        <th>Entries</th>
                        <th>Collected</th>
                        <th>Comm %</th>
                        <th>Earned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedHostMatches.map(m => {
                        const collected = m.slots.joined * m.entryFee;
                        const earned = collected * ((m.hostCommissionPercent || 0) / 100);
                        const matchDate = new Date(m.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        return (
                          <tr key={m.matchId}>
                            <td className="truncate" style={{ maxWidth: '80px' }} title={m.title}>{m.title}</td>
                            <td>{matchDate}</td>
                            <td>{m.slots.joined}</td>
                            <td>₹{collected}</td>
                            <td>{m.hostCommissionPercent}%</td>
                            <td className="highlight-emerald" style={{ fontWeight: 'bold' }}>₹{earned.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 3.2 Ongoing Escrow (Upcoming/Live matches) */}
            {earningsTab === 'escrow' && (
              <div className="earnings-table-container">
                {activeHostMatches.length === 0 ? (
                  <div className="earnings-empty-state">
                    <p>No active tournaments. Create lobbies and collect registrations to hold escrow.</p>
                  </div>
                ) : (
                  <table className="earnings-table">
                    <thead>
                      <tr>
                        <th>Lobby Name</th>
                        <th>Status</th>
                        <th>Entries</th>
                        <th>Escrow Pool</th>
                        <th>Comm %</th>
                        <th>Potential</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHostMatches.map(m => {
                        const escrow = m.slots.joined * m.entryFee;
                        const potential = escrow * ((m.hostCommissionPercent || 0) / 100);
                        return (
                          <tr key={m.matchId}>
                            <td className="truncate" style={{ maxWidth: '80px' }} title={m.title}>{m.title}</td>
                            <td>
                              <span className={`status-pill ${m.status.toLowerCase()}`}>
                                {m.status}
                              </span>
                            </td>
                            <td>{m.slots.joined}/{m.slots.total}</td>
                            <td>₹{escrow}</td>
                            <td>{m.hostCommissionPercent}%</td>
                            <td className="highlight-blue" style={{ fontWeight: 'bold' }}>₹{potential.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 3.3 Payout Ledger (Released commission transactions) */}
            {earningsTab === 'payouts' && (
              <div className="earnings-ledger-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hostCommissionTxns.length === 0 ? (
                  <div className="earnings-empty-state">
                    <p>No payout transactions logged yet. Release standings payouts to populate transaction cards.</p>
                  </div>
                ) : (
                  hostCommissionTxns.map(tx => (
                    <div className="earnings-ledger-card" key={tx.transactionId}>
                      <div className="ledger-card-left">
                        <div className="ledger-card-icon">
                          ₹
                        </div>
                        <div className="ledger-card-info">
                          <h5>Host Commission Released</h5>
                          <span className="ledger-ref">Ref: {tx.upiRef}</span>
                          <span className="ledger-time">{new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                      <div className="ledger-card-right">
                        <span className="ledger-amount">+₹{tx.amount.toFixed(0)}</span>
                        <span className="ledger-status success">{tx.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* 3. Manage Tournament Room Details & Scorecard */}
      {activeTab === 'manage' && currentMatch && (
        <div className="host-management-board" style={{ padding: '0 4px' }}>
          
          {/* Match Description Banner Card */}
          <div className="premium-white-card" style={{ marginBottom: '16px', overflow: 'hidden' }}>
            <div className="lobby-card-banner-wrapper" style={{ height: '120px' }}>
              <img src={currentMatch.game === 'freefire' ? '/img/freefire.avif' : '/img/bgmi.avif'} alt={currentMatch.title} className="lobby-card-banner-img" />
            </div>
            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
                  {currentMatch.title.toUpperCase()}
                </h4>
                <span className="badge-status-glow" style={{ fontSize: '0.65rem' }}>{currentMatch.status}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', marginBottom: '4px' }}>
                Organized By: <strong className="highlight-red">{getOrganizerName(currentMatch.organizerId, currentMatch.organizerName)}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '0.68rem', color: '#64748b', fontWeight: 'bold' }}>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MAP: {currentMatch.mapType === 'ClashSquad' ? 'Clash Arena' : currentMatch.map}</span>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>MODE: {currentMatch.mapType === 'ClashSquad' ? `CS (${currentMatch.clashSquadFormat})` : currentMatch.mode}</span>
                <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>TPP</span>
              </div>
            </div>
          </div>

          {/* EDIT TOURNAMENT OPTION */}
          {(currentMatch.status === 'Registering' || currentMatch.status === 'Full' || currentMatch.status === 'RoomReady') && (
            <div className="host-manage-box" style={{ margin: 0, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0 }}>Tournament Configuration</h5>
                <button 
                  type="button" 
                  className="role-btn" 
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ padding: '4px 10px', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold' }}
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Details'}
                </button>
              </div>

              {isEditing ? (
                <form noValidate onSubmit={handleEditSubmit} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentMatch.slots.joined > 0 && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px', fontSize: '0.68rem', color: '#f87171', lineHeight: '1.4' }}>
                      <strong>⚠️ Structural Locks Active:</strong> Since {currentMatch.slots.joined} player(s) have already registered, fields like format, game, mode, commission, entry fee, and prize payouts splits are locked to protect registration stakes.
                    </div>
                  )}

                  <div className="form-group">
                    <label>Title</label>
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => { setEditTitle(e.target.value); if (editErrors.title) setEditErrors(prev => ({ ...prev, title: null })); }}
                      style={{ border: editErrors.title ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                    />
                    {editErrors.title && <span className="custom-input-error">{editErrors.title}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Match Format</label>
                      <select 
                        value={editMapType} 
                        disabled={currentMatch.slots.joined > 0}
                        className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditMapType(val);
                          if (val === 'ClashSquad') {
                            setEditRulesType('WinnerTakesAll');
                          }
                        }}
                      >
                        <option value="BigMap">Big Map (Standard)</option>
                        <option value="ClashSquad">Clash Squad (Round Matchup)</option>
                      </select>
                    </div>
                    {editMapType === 'ClashSquad' && (
                      <div className="form-group flex-1">
                        <label>Clash Squad Size</label>
                        <select 
                          value={editClashSquadFormat} 
                          disabled={currentMatch.slots.joined > 0}
                          className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                          onChange={(e) => setEditClashSquadFormat(e.target.value)}
                        >
                          <option value="1v1">1v1 (2 players)</option>
                          <option value="2v2">2v2 (4 players)</option>
                          <option value="4v4">4v4 (8 players)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Select Game</label>
                      <select 
                        value={editGame} 
                        disabled={currentMatch.slots.joined > 0}
                        className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditGame(val);
                          if (val === 'bgmi') setEditMap('Erangel');
                          else setEditMap('Bermuda');
                        }}
                      >
                        <option value="bgmi">BGMI</option>
                        <option value="freefire">Free Fire Max</option>
                      </select>
                    </div>
                    <div className="form-group flex-1">
                      <label>Match Type</label>
                      <select 
                        value={editType} 
                        disabled={currentMatch.slots.joined > 0}
                        className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                        onChange={(e) => setEditType(e.target.value)}
                      >
                        <option value="SingleMatch">Single Match Lobby</option>
                        <option value="League" disabled>League Bracket (Coming Soon)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Map</label>
                      {editMapType === 'ClashSquad' ? (
                        <input type="text" value="Clash Arena" disabled className="disabled-input" />
                      ) : (
                        <select value={editMap} onChange={(e) => setEditMap(e.target.value)}>
                          {editGame === 'bgmi' ? (
                            <>
                              <option value="Erangel">Erangel</option>
                              <option value="Miramar">Miramar</option>
                              <option value="Sanhok">Sanhok</option>
                              <option value="Vikendi">Vikendi</option>
                              <option value="Karakin">Karakin</option>
                            </>
                          ) : (
                            <>
                              <option value="Bermuda">Bermuda</option>
                              <option value="Purgatory">Purgatory</option>
                              <option value="Kalahari">Kalahari</option>
                              <option value="Alpine">Alpine</option>
                              <option value="NeXTerra">NeXTerra</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                    <div className="form-group flex-1">
                      <label>Team Mode</label>
                      {editMapType === 'ClashSquad' ? (
                        <input 
                          type="text" 
                          value={editClashSquadFormat === '1v1' ? 'Solo' : editClashSquadFormat === '2v2' ? 'Duo' : 'Squad'} 
                          disabled 
                          className="disabled-input" 
                        />
                      ) : (
                        <select 
                          value={editMode} 
                          disabled={currentMatch.slots.joined > 0}
                          className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                          onChange={(e) => setEditMode(e.target.value)}
                        >
                          <option value="Solo">Solo</option>
                          <option value="Duo">Duo</option>
                          <option value="Squad">Squad</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={editStartTime}
                      onChange={(e) => { setEditStartTime(e.target.value); if (editErrors.startTime) setEditErrors(prev => ({ ...prev, startTime: null })); }}
                      style={{ border: editErrors.startTime ? '1px solid #ef4444' : '1px solid var(--color-border)', color: 'white', backgroundColor: '#071120', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', width: '100%' }}
                    />
                    {editErrors.startTime && <span className="custom-input-error">{editErrors.startTime}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Entry Fee (₹)</label>
                      <input 
                        type="number" 
                        value={editEntryFee}
                        onChange={(e) => { setEditEntryFee(e.target.value); if (editErrors.entryFee) setEditErrors(prev => ({ ...prev, entryFee: null })); }}
                        disabled={currentMatch.slots.joined > 0}
                        style={{ border: editErrors.entryFee ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                        className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                      />
                      {editErrors.entryFee && <span className="custom-input-error">{editErrors.entryFee}</span>}
                    </div>

                    <div className="form-group flex-1">
                      <label>Total Spots</label>
                      {editMapType === 'ClashSquad' || editType === 'League' ? (
                        <input 
                          type="text" 
                          value={`${editMapType === 'ClashSquad' ? (editClashSquadFormat === '1v1' ? 2 : editClashSquadFormat === '2v2' ? 4 : 8) : 4} spots (Locked)`} 
                          disabled 
                          className="disabled-input" 
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <input 
                            type="number" 
                            value={editSlots}
                            onChange={(e) => { setEditSlots(e.target.value); if (editErrors.slots) setEditErrors(prev => ({ ...prev, slots: null })); }}
                            style={{ border: editErrors.slots ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                          />
                          {editErrors.slots && <span className="custom-input-error">{editErrors.slots}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Host Commission Rate (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="25" 
                        value={editCommission}
                        disabled={currentMatch.slots.joined > 0}
                        onChange={(e) => setEditCommission(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <span className="comm-val highlight-gold">{editCommission}%</span>
                    </div>
                  </div>

                  <div className="prize-rules-section" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px' }}>
                    <h5>Payout & Splits Ruleset</h5>

                    <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Total Escrow Pool:</span>
                         <strong className="highlight-gold">₹{calculateEditTotalEscrow().toFixed(0)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Host Commission ({editCommission}%):</span>
                        <strong className="highlight-gold">₹{(calculateEditTotalEscrow() * (parseFloat(editCommission) || 0) / 100).toFixed(0)}</strong>
                      </div>
                      <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 'bold' }}>
                        <span style={{ color: 'white' }}>Net Reward Pool to Distribute:</span>
                        <span className="highlight-emerald" style={{ color: 'var(--color-success)' }}>₹{calculateEditNetPrizePool().toFixed(0)}</span>
                      </div>

                      {currentMatch.slots.joined === 0 && editRulesType !== 'WinnerTakesAll' && (
                        <div style={{ marginTop: '8px', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                          <button
                            type="button"
                            onClick={handleApplyEditSuggestion}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                          >
                            Apply Suggested Splits
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Distribution Law</label>
                      {editMapType === 'ClashSquad' ? (
                        <input type="text" value="Winner Takes All (100% split)" disabled className="disabled-input" />
                      ) : (
                        <select 
                          value={editRulesType} 
                          disabled={currentMatch.slots.joined > 0}
                          className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                          onChange={(e) => {
                            setEditRulesType(e.target.value);
                            if (e.target.value === 'WinnerTakesAll') {
                              setEditPerKillPrize('0');
                              setEditPlacement1st('0');
                              setEditPlacement2nd('0');
                              setEditPlacement3rd('0');
                            }
                          }}
                        >
                          <option value="PerKillAndPlacement">Per Kill + Placement Splits</option>
                          <option value="PlacementOnly">Placement Splits Only</option>
                          <option value="WinnerTakesAll">Winner Takes All (100% split)</option>
                        </select>
                      )}
                    </div>

                    {editRulesType === 'PerKillAndPlacement' && (
                      <div className="form-group">
                        <label>Reward per Kill (₹)</label>
                        <input 
                          type="number" 
                          value={editPerKillPrize}
                          disabled={currentMatch.slots.joined > 0}
                          className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                          onChange={(e) => { setEditPerKillPrize(e.target.value); if (editErrors.perKillPrize) setEditErrors(prev => ({ ...prev, perKillPrize: null })); }}
                          style={{ border: editErrors.perKillPrize ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                        />
                        {editErrors.perKillPrize && <span className="custom-input-error">{editErrors.perKillPrize}</span>}
                      </div>
                    )}

                    {editRulesType !== 'WinnerTakesAll' && (
                      <div className="form-row">
                        <div className="form-group flex-1">
                          <label>1st Position (₹)</label>
                           <input 
                             type="number" 
                             value={editPlacement1st}
                             disabled={currentMatch.slots.joined > 0}
                             className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                             onChange={(e) => { setEditPlacement1st(e.target.value); if (editErrors.placement1st) setEditErrors(prev => ({ ...prev, placement1st: null })); }}
                             style={{ border: editErrors.placement1st ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                           />
                          {editErrors.placement1st && <span className="custom-input-error">{editErrors.placement1st}</span>}
                        </div>
                        <div className="form-group flex-1">
                          <label>2nd Position (₹)</label>
                          <input 
                            type="number" 
                            value={editPlacement2nd}
                            disabled={currentMatch.slots.joined > 0}
                            className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                            onChange={(e) => setEditPlacement2nd(e.target.value)}
                          />
                        </div>
                        <div className="form-group flex-1">
                          <label>3rd Position (₹)</label>
                          <input 
                            type="number" 
                            value={editPlacement3rd}
                            disabled={currentMatch.slots.joined > 0}
                            className={currentMatch.slots.joined > 0 ? 'disabled-input' : ''}
                            onChange={(e) => setEditPlacement3rd(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="host-manage-action-btn complete" disabled={updatingMatch} style={{ marginTop: '4px' }}>
                    {updatingMatch ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <RefreshCw size={14} className="spin-animate" /> Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </form>
              ) : (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '6px', lineHeight: '1.4' }}>
                  Tournament details can be modified before going live. Start time, title, and maps are fully adjustable.
                </p>
              )}
            </div>
          )}

          {/* Match Rewards & Rules grid */}
          <div className="slots-match-banner-summary" style={{ borderBottom: 'none', marginBottom: 16 }}>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', marginBottom: '8px' }}>
              MATCH REWARDS & RULES
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
              <div>• Total Prize Pool: <strong className="highlight-gold">₹{(currentMatch.prizePool || (currentMatch.entryFee * currentMatch.slots.total * (1 - currentMatch.hostCommissionPercent / 100))).toFixed(0)}</strong></div>
              <div>• Entry Fee: <strong className="highlight-gold">₹{currentMatch.entryFee}</strong></div>
              {currentMatch.prizeRules.type === 'PerKillAndPlacement' && (
                <div>• Reward Per Kill: <strong className="highlight-gold">₹{currentMatch.prizeRules.perKillPrize}</strong></div>
              )}
              {currentMatch.prizeRules.type === 'WinnerTakesAll' ? (
                currentMatch.mode === 'Solo' ? (
                  <div>• 1st Place: <strong>100% of Prize Pool (₹{(currentMatch.prizePool || (currentMatch.entryFee * currentMatch.slots.total * (1 - currentMatch.hostCommissionPercent / 100))).toFixed(0)})</strong></div>
                ) : (
                  <div style={{ gridColumn: 'span 2' }}>
                    • 1st Place Team: <strong>100% of Prize Pool (₹{(currentMatch.prizePool || (currentMatch.entryFee * currentMatch.slots.total * (1 - currentMatch.hostCommissionPercent / 100))).toFixed(0)}) split equally (₹{((currentMatch.prizePool || (currentMatch.entryFee * currentMatch.slots.total * (1 - currentMatch.hostCommissionPercent / 100))) / (currentMatch.mode === 'Duo' ? 2 : 4)).toFixed(0)} each)</strong>
                  </div>
                )
              ) : (
                <>
                  {currentMatch.prizeRules.placementSplit['1st'] && <div>• 1st Place: <strong>₹{currentMatch.prizeRules.placementSplit['1st']}</strong></div>}
                  {currentMatch.prizeRules.placementSplit['2nd'] && <div>• 2nd Place: <strong>₹{currentMatch.prizeRules.placementSplit['2nd']}</strong></div>}
                  {currentMatch.prizeRules.placementSplit['3rd'] && <div>• 3rd Place: <strong>₹{currentMatch.prizeRules.placementSplit['3rd']}</strong></div>}
                </>
              )}
            </div>
          </div>

          {/* ORGANIZER MANAGEMENT TOOLS SECTION */}
          <div className="organizer-controls-section" style={{ marginBottom: 16 }}>
            <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', marginBottom: '8px' }}>
              HOST CONSOLE & CONTROLS
            </h5>

            {/* STEP 1: Dispatch Room ID/Pass if Registering or Full */}
            {(currentMatch.status === 'Registering' || currentMatch.status === 'Full') && (
              <form className="host-manage-box" noValidate onSubmit={handleDispatchRoom} style={{ margin: 0, marginBottom: 12 }}>
                <h5>1. Dispatch Game Room Credentials</h5>
                <p className="box-desc">Verify in-game custom room creation and supply details here for players.</p>
                
                <div className="form-row">
                  <div className="form-group flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label>Room ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 98124089" 
                      value={roomId} 
                      onChange={(e) => { setRoomId(e.target.value); if (roomErrors.roomId) setRoomErrors(prev => ({ ...prev, roomId: null })); }}
                      style={{ border: roomErrors.roomId ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                    />
                    {roomErrors.roomId && <span className="custom-input-error">{roomErrors.roomId}</span>}
                  </div>
                  <div className="form-group flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label>Room Password</label>
                    <input 
                      type="text" 
                      placeholder="e.g. battle23" 
                      value={roomPass} 
                      onChange={(e) => { setRoomPass(e.target.value); if (roomErrors.roomPass) setRoomErrors(prev => ({ ...prev, roomPass: null })); }}
                      style={{ border: roomErrors.roomPass ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                    />
                    {roomErrors.roomPass && <span className="custom-input-error">{roomErrors.roomPass}</span>}
                  </div>
                </div>
                
                <button type="submit" className="host-manage-action-btn" disabled={dispatchingRoom}>
                  {dispatchingRoom ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="spin-animate" /> Sending...
                    </span>
                  ) : (
                    <>
                      <Key size={14} /> Send Credentials to Players
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Launch Live if Room Details are dispatched */}
            {currentMatch.status === 'RoomReady' && (
              <div className="host-manage-box" style={{ margin: 0, marginBottom: 12 }}>
                <h5>2. Launch Tournament match LIVE</h5>
                <p className="box-desc">After players have checked credentials and joined custom lobby, set match status to Live.</p>
                <button onClick={handleStartLive} className="host-manage-action-btn play" disabled={startingLive}>
                  {startingLive ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="spin-animate" /> Launching...
                    </span>
                  ) : (
                    <>
                      <Play size={14} /> Set Live Status
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 3: Standings upload scorecard (Live status) */}
            {currentMatch.status === 'Live' && currentMatch.type === 'SingleMatch' && (
              <form className="host-manage-box" noValidate onSubmit={handleSingleStandingsSubmit} style={{ margin: 0, marginBottom: 12 }}>
                <h5>3. Upload Standings Scorecard & Release Escrow</h5>
                <p className="box-desc text-warning">Verify standings. Submitting triggers immediate calculations and credits wallet winnings. NO screenshots required.</p>
                
                <div className="standings-table-wrapper">
                  {standings.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '10px', color: '#94a3b8' }}>No players joined to rate.</p>
                  ) : (
                    standings.map((player, idx) => (
                      <div className="standing-editor-row" key={player.userId}>
                        <div className="row-meta">
                          <span className="player-ign">{player.fullName}</span>
                          <span className="player-char-id">ID: {player.characterId}</span>
                        </div>
                        
                        <div className="row-fields">
                          <div className="field-box">
                            <label>Kills</label>
                            <input 
                              type="number" 
                              value={player.kills} 
                              onChange={(e) => handleSingleStandingsChange(idx, 'kills', e.target.value)}
                              style={{ border: standingsErrors[`${player.userId}_kills`] ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                            />
                            {standingsErrors[`${player.userId}_kills`] && <span className="custom-input-error">{standingsErrors[`${player.userId}_kills`]}</span>}
                          </div>
                          <div className="field-box">
                            <label>Position</label>
                            <input 
                              type="number" 
                              value={player.position} 
                              onChange={(e) => handleSingleStandingsChange(idx, 'position', e.target.value)}
                              disabled={player.disqualified}
                              style={{ border: standingsErrors[`${player.userId}_position`] ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                            />
                            {standingsErrors[`${player.userId}_position`] && <span className="custom-input-error">{standingsErrors[`${player.userId}_position`]}</span>}
                          </div>
                          <div className="field-box dq">
                            <label>DQ</label>
                            <input 
                              type="checkbox" 
                              checked={player.disqualified} 
                              onChange={(e) => handleSingleStandingsChange(idx, 'disqualified', e.target.checked)}
                            />
                          </div>
                        </div>

                        {player.disqualified && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '4px' }}>
                            <input 
                              type="text" 
                              placeholder="Disqualification Reason" 
                              value={player.reason} 
                              onChange={(e) => handleSingleStandingsChange(idx, 'reason', e.target.value)}
                              className="dq-reason-input"
                              style={{ border: standingsErrors[`${player.userId}_reason`] ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)' }}
                            />
                            {standingsErrors[`${player.userId}_reason`] && <span className="custom-input-error">{standingsErrors[`${player.userId}_reason`]}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <button type="submit" className="host-manage-action-btn complete" disabled={standings.length === 0 || submittingStandings}>
                  {submittingStandings ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <RefreshCw size={14} className="spin-animate" /> Submitting...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Submit Standings & Payouts
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: League Matchup bracket editor (Live / Full status) */}
            {currentMatch.type === 'League' && currentMatch.bracket && (
              <div className="host-manage-box" style={{ margin: 0, marginBottom: 12 }}>
                <h5>League Tournament Bracket Management</h5>
                <p className="box-desc">Submit matchup results round-by-round to advance the bracket. Completion of finals releases payout.</p>

                {/* Matchup scorecard popup editing */}
                {selectedMatchupId && (
                  <form className="matchup-modal-inline" noValidate onSubmit={selectedMatchupId === 'mu_finals' ? handleLeagueFinalsSubmit : handleMatchupSubmit}>
                    <h6>Edit Matchup Score ({selectedMatchupId === 'mu_finals' ? 'Finals' : 'Semifinal'})</h6>
                    
                    {/* Matchup Team 1 Info */}
                    <div className="matchup-team-edit-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                      <span className="team-edit-name" style={{ alignSelf: 'flex-start' }}>
                        {currentMatch.bracket.rounds.flatMap(r => r.matchups).find(mu => mu.matchupId === selectedMatchupId)?.team1Name}
                      </span>
                      <div className="team-edit-inputs" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '70px' }}>
                          <input 
                            type="number" 
                            placeholder="Score" 
                            value={team1Score} 
                            onChange={(e) => { setTeam1Score(e.target.value); if (matchupErrors.team1Score) setMatchupErrors(prev => ({ ...prev, team1Score: null })); }}
                            style={{ width: '100%', border: matchupErrors.team1Score ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                          />
                          {matchupErrors.team1Score && <span className="custom-input-error">{matchupErrors.team1Score}</span>}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '70px' }}>
                          <input 
                            type="number" 
                            placeholder="Kills" 
                            value={team1Kills} 
                            onChange={(e) => { setTeam1Kills(e.target.value); if (matchupErrors.team1Kills) setMatchupErrors(prev => ({ ...prev, team1Kills: null })); }}
                            style={{ width: '100%', border: matchupErrors.team1Kills ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                          />
                          {matchupErrors.team1Kills && <span className="custom-input-error">{matchupErrors.team1Kills}</span>}
                        </div>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                          <input 
                            type="checkbox" 
                            checked={team1Disq} 
                            onChange={(e) => setTeam1Disq(e.target.checked)}
                          /> DQ
                        </label>
                      </div>
                    </div>

                    {/* Matchup Team 2 Info */}
                    <div className="matchup-team-edit-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                      <span className="team-edit-name" style={{ alignSelf: 'flex-start' }}>
                        {currentMatch.bracket.rounds.flatMap(r => r.matchups).find(mu => mu.matchupId === selectedMatchupId)?.team2Name}
                      </span>
                      <div className="team-edit-inputs" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '70px' }}>
                          <input 
                            type="number" 
                            placeholder="Score" 
                            value={team2Score} 
                            onChange={(e) => { setTeam2Score(e.target.value); if (matchupErrors.team2Score) setMatchupErrors(prev => ({ ...prev, team2Score: null })); }}
                            style={{ width: '100%', border: matchupErrors.team2Score ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                          />
                          {matchupErrors.team2Score && <span className="custom-input-error">{matchupErrors.team2Score}</span>}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '70px' }}>
                          <input 
                            type="number" 
                            placeholder="Kills" 
                            value={team2Kills} 
                            onChange={(e) => { setTeam2Kills(e.target.value); if (matchupErrors.team2Kills) setMatchupErrors(prev => ({ ...prev, team2Kills: null })); }}
                            style={{ width: '100%', border: matchupErrors.team2Kills ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                          />
                          {matchupErrors.team2Kills && <span className="custom-input-error">{matchupErrors.team2Kills}</span>}
                        </div>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                          <input 
                            type="checkbox" 
                            checked={team2Disq} 
                            onChange={(e) => setTeam2Disq(e.target.checked)}
                          /> DQ
                        </label>
                      </div>
                    </div>

                    <div className="modal-actions-row">
                      <button type="button" className="cancel-btn" onClick={() => setSelectedMatchupId(null)}>Cancel</button>
                      <button type="submit" className="save-btn">
                        {selectedMatchupId === 'mu_finals' ? 'Complete Finals' : 'Save Matchup'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Render Bracket Layout */}
                <div className="bracket-visualizer">
                  {currentMatch.bracket.rounds.map((round) => (
                    <div className="bracket-round-column" key={round.roundId}>
                      <h6 className="round-title-label">{round.roundName}</h6>
                      
                      <div className="round-matchups-list">
                        {round.matchups.map((matchup) => (
                          <div 
                            className={`matchup-bracket-card ${matchup.status === 'Completed' ? 'completed' : 'clickable'}`}
                            key={matchup.matchupId}
                            onClick={() => handleMatchupClick(matchup)}
                          >
                            <div className="team-row">
                              <span className="team-name truncate">{matchup.team1Name || 'TBD'}</span>
                              <span className="team-score">{matchup.team1Score !== null ? matchup.team1Score : '-'}</span>
                            </div>
                            <div className="team-divider"></div>
                            <div className="team-row">
                              <span className="team-name truncate">{matchup.team2Name || 'TBD'}</span>
                              <span className="team-score">{matchup.team2Score !== null ? matchup.team2Score : '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Completed state overview */}
            {currentMatch.status === 'Completed' && (
              <>
                <div className="host-manage-box" style={{ margin: 0, marginBottom: 12 }}>
                  <div className="completed-success-message">
                    <CheckCircle2 size={36} className="highlight-emerald" />
                    <h5>Tournament Fully Completed</h5>
                    <p>This match's payouts have been computed and released into participant winnings wallets. Host commission has been transferred to your wallet.</p>
                  </div>
                </div>

                {/* Match Leaderboard Standings */}
                <div className="host-manage-box" style={{ margin: 0, marginBottom: 12 }}>
                  <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', letterSpacing: '0.5px', marginBottom: '12px', textTransform: 'uppercase' }}>
                    MATCH STANDINGS & PAYOUTS
                  </h5>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {registrations.filter(r => r.matchId === currentMatch.matchId).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                        No standings recorded for this match.
                      </div>
                    ) : (
                      registrations
                        .filter(r => r.matchId === currentMatch.matchId)
                        .sort((a, b) => {
                          if (a.matchStats?.disqualified) return 1;
                          if (b.matchStats?.disqualified) return -1;
                          return (a.matchStats?.position || 999) - (b.matchStats?.position || 999);
                        })
                        .map((playerReg, idx) => {
                          const isDisqualified = playerReg.matchStats?.disqualified;
                          const position = playerReg.matchStats?.position || idx + 1;
                          const kills = playerReg.matchStats?.kills || 0;
                          
                          // Calculate individual winnings
                          let winnings = 0;
                          if (!isDisqualified) {
                            const perKillWinnings = kills * (currentMatch.prizeRules?.perKillPrize || 0);
                            let placementWinnings = 0;
                            const teamSize = currentMatch.mode === 'Duo' ? 2 : currentMatch.mode === 'Squad' ? 4 : 1;
                            
                            if (position === 1) {
                              if (currentMatch.prizeRules?.type === 'WinnerTakesAll') {
                                const feeCollected = currentMatch.slots?.joined * currentMatch.entryFee;
                                const hostCommission = feeCollected * (currentMatch.hostCommissionPercent / 100);
                                placementWinnings = (feeCollected - hostCommission) / teamSize;
                              } else {
                                placementWinnings = (currentMatch.prizeRules?.placementSplit?.['1st'] || 0) / teamSize;
                              }
                            } else if (position === 2) {
                              placementWinnings = (currentMatch.prizeRules?.placementSplit?.['2nd'] || 0) / teamSize;
                            } else if (position === 3) {
                              placementWinnings = (currentMatch.prizeRules?.placementSplit?.['3rd'] || 0) / teamSize;
                            }
                            winnings = perKillWinnings + placementWinnings;
                          }

                          const teamSizeVal = currentMatch.mode === 'Duo' ? 2 : currentMatch.mode === 'Squad' ? 4 : 1;
                          let slotLabel = `Slot #${playerReg.slotNumber || (idx + 1)}`;
                          if (currentMatch.mode !== 'Solo' && playerReg.slotNumber) {
                            const teamNum = Math.ceil(playerReg.slotNumber / teamSizeVal);
                            const posNum = ((playerReg.slotNumber - 1) % teamSizeVal) + 1;
                            slotLabel = `Team ${teamNum} - P${posNum}`;
                          }

                          return (
                            <div 
                              key={playerReg.registrationId} 
                              className="results-player-card"
                              style={{ padding: '10px 12px', border: isDisqualified ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--color-border)' }}
                            >
                              <div className="results-row-main" style={{ justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div className="results-rank-badge-col">
                                    <div style={{ 
                                      fontSize: '0.62rem', 
                                      fontWeight: '800', 
                                      color: isDisqualified ? '#ef4444' : 'var(--color-yellow-gold)', 
                                      backgroundColor: 'rgba(255,255,255,0.03)',
                                      border: isDisqualified ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--color-border)',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontFamily: 'var(--font-heading)'
                                    }}>
                                      {isDisqualified ? 'DQ' : `#${position}`}
                                    </div>
                                  </div>
                                  
                                  <div className="results-player-info">
                                    <strong className="results-player-name" style={{ fontSize: '0.75rem' }}>
                                      {playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", "")}
                                    </strong>
                                    <span className="results-player-id" style={{ fontSize: '0.6rem' }}>
                                      {slotLabel} | IGN: {playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", "")}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', fontWeight: 'bold' }}>
                                    Kills: <span className="highlight-gold">{kills}</span>
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: isDisqualified ? '#ef4444' : 'var(--color-success)', fontWeight: 'bold' }}>
                                    {isDisqualified ? 'No Winnings' : `Won: ₹${winnings.toFixed(0)}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Cancelled state overview */}
            {currentMatch.status === 'Cancelled' && (
              <div className="host-manage-box" style={{ margin: 0, marginBottom: 12, border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                <div className="completed-success-message">
                  <ShieldAlert size={36} style={{ color: '#ef4444' }} />
                  <h5 style={{ color: '#ef4444' }}>Tournament Cancelled</h5>
                  <p>This match has been cancelled by you. All registration fees have been automatically refunded to the participants' wallets.</p>
                  {currentMatch.cancelReason && (
                    <p style={{ fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Reason: {currentMatch.cancelReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Cancel Tournament Option */}
            {currentMatch.status !== 'Completed' && currentMatch.status !== 'Cancelled' && (
              <form className="host-manage-box" noValidate onSubmit={handleCancelTournamentSubmit} style={{ margin: 0, marginBottom: 12, border: '1px dashed rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.01)' }}>
                <h5 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} /> Cancel Tournament (Escrow Refund)
                </h5>
                <p className="box-desc" style={{ color: '#94a3b8' }}>
                  Warning: Cancelling will delete this custom room event, forfeit host commission, and automatically credit 100% of registration fees back to all participants' wallets.
                </p>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Reason for Cancellation</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Technical issues / Match rescheduled" 
                    value={cancelReason}
                    onChange={(e) => { setCancelReason(e.target.value); if (cancelError) setCancelError(''); }}
                    style={{ width: '100%', border: cancelError ? '1px solid #ef4444' : '1px solid var(--color-border)' }}
                  />
                  {cancelError && <span className="custom-input-error">{cancelError}</span>}
                </div>
                <button type="submit" className="host-manage-action-btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  Cancel Tournament & Refund Players
                </button>
              </form>
            )}
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
            <div style={{ textAlign: 'center', padding: '8px 0', marginBottom: 16 }}>
              <button 
                className="lobby-join-btn-outline" 
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                onClick={async () => {
                  await loadMatchRegistrations(currentMatch.matchId);
                  setShowParticipants(true);
                }}
              >
                LOAD PARTICIPANTS ({registrations.filter(r => r.matchId === currentMatch.matchId).length} Joined)
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {/* Roster Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h5 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-yellow-gold)', letterSpacing: '0.5px' }}>
                  REGISTERED ROSTER ({registrations.filter(r => r.matchId === currentMatch.matchId).length}/{currentMatch.slots.total})
                </h5>
                <button 
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.65rem', textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => setShowParticipants(false)}
                >
                  Hide
                </button>
              </div>

              {/* Roster List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {registrations.filter(r => r.matchId === currentMatch.matchId).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: 'var(--color-card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                    No players have joined this lobby yet.
                  </div>
                ) : (
                  registrations
                    .filter(r => r.matchId === currentMatch.matchId)
                    .sort((a, b) => (a.slotNumber || 999) - (b.slotNumber || 999))
                    .map((playerReg, idx) => {
                      const isMe = playerReg.userId === user.id;
                      const teamSizeVal = currentMatch.mode === 'Duo' ? 2 : currentMatch.mode === 'Squad' ? 4 : 1;
                      
                      // Format slot label
                      let slotLabel = `Slot #${playerReg.slotNumber || (idx + 1)}`;
                      if (currentMatch.mode !== 'Solo' && playerReg.slotNumber) {
                        const teamNum = Math.ceil(playerReg.slotNumber / teamSizeVal);
                        const posNum = ((playerReg.slotNumber - 1) % teamSizeVal) + 1;
                        slotLabel = `Team ${teamNum} - P${posNum}`;
                      }

                      return (
                        <div 
                          key={playerReg.registrationId} 
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
                                {slotLabel}
                              </div>
                            </div>
                            
                            <div className="results-player-info">
                              <strong className="results-player-name" style={{ fontSize: '0.75rem' }}>
                                {playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", "")}
                              </strong>
                              <span className="results-player-id" style={{ fontSize: '0.6rem' }}>
                                IGN: {playerReg.inGameName || playerReg.teamName.replace(" Solo", "").replace(" Squad", "")} | ID: {playerReg.inGameCharacterId || playerReg.characterId || 'Linked'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          <button className="manage-back-btn" onClick={() => setActiveTab('list')} style={{ width: '100%', marginTop: '8px' }}>
            Back to List
          </button>
        </div>
      )}

      {showCancelConfirm && (
        <div className="custom-alert-overlay" style={{ zIndex: 3000 }}>
          <div className="custom-alert-box animated-scale-up" style={{ borderColor: '#ef4444', boxShadow: '0 20px 45px rgba(0,0,0,0.85), 0 0 20px rgba(239,68,68,0.25)' }}>
            <div className="custom-alert-header">
              <ShieldAlert size={28} style={{ color: '#ef4444' }} />
              <h4>Cancel Tournament?</h4>
            </div>
            <div className="custom-alert-message">
              <p>Are you absolutely sure you want to cancel this tournament? This will automatically refund all registered players' entry fees.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                type="button" 
                className="custom-alert-btn" 
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 10px rgba(220,38,38,0.3)', flex: 1 }}
                onClick={executeCancellation}
                disabled={cancelingMatch}
              >
                {cancelingMatch ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="spin-animate" /> Canceling...
                  </span>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
              <button 
                type="button" 
                className="custom-alert-btn" 
                style={{ background: '#1e293b', border: '1px solid var(--color-border)', color: '#cbd5e1', boxShadow: 'none', flex: 1 }}
                onClick={() => setShowCancelConfirm(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
