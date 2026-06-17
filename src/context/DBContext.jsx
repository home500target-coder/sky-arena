import React, { createContext, useContext, useState, useEffect } from 'react';

const DBContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DBProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showSpinOverlay, setShowSpinOverlay] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to fetch authorization headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('skyarena_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // 1. Fetch User Profile
  const fetchProfile = async () => {
    const token = localStorage.getItem('skyarena_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setUser({
          ...data.user,
          id: data.user._id
        });
      } else {
        localStorage.removeItem('skyarena_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch all matches
  const fetchMatches = async () => {
    try {
      const res = await fetch(`${API_URL}/tournaments`);
      const data = await res.json();
      if (data.success) {
        // Map backend schema to frontend expectation
        const formatted = data.matches.map(m => ({
          matchId: m._id,
          title: m.title,
          game: m.game,
          type: m.type,
          map: m.map,
          mapType: m.mapType || 'BigMap',
          clashSquadFormat: m.clashSquadFormat || 'N/A',
          mode: m.mode,
          startTime: m.startTime,
          entryFee: m.entryFee,
          hostCommissionPercent: m.hostCommissionPercent,
          prizeRules: m.prizeRules,
          slots: m.slots,
          status: m.status,
          organizerId: m.organizerId?._id || m.organizerId,
          organizerName: m.organizerId?.fullName || 'Organizer',
          roomDetails: m.roomDetails,
          bracket: m.bracket,
          cancelReason: m.cancelReason,
          createdAt: m.createdAt
        }));
        setMatches(formatted);
      }
    } catch (error) {
      console.error('Fetch matches error:', error);
    }
  };

  // 3. Fetch transaction history
  const fetchTransactions = async () => {
    if (!localStorage.getItem('skyarena_token')) return;
    try {
      const res = await fetch(`${API_URL}/wallet/transactions`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        // Map backend fields to frontend expectation
        const formatted = data.transactions.map(t => ({
          transactionId: t._id,
          userId: t.userId,
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          upiRef: t.upiRef,
          timestamp: t.timestamp
        }));
        setTransactions(formatted);
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
    }
  };

  // 4. Fetch joined matches
  const fetchJoinedMatches = async () => {
    if (!localStorage.getItem('skyarena_token')) return;
    try {
      const res = await fetch(`${API_URL}/tournaments/joined`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        const formatted = data.registrations.map(r => ({
          registrationId: r._id,
          matchId: r.matchId?._id || r.matchId,
          userId: r.userId,
          teamName: r.teamName,
          inGameCharacterId: r.inGameCharacterId,
          registeredAt: r.registeredAt,
          slotNumber: r.slotNumber,
          teamNumber: r.teamNumber,
          teamSlotPosition: r.teamSlotPosition,
          matchStats: r.matchStats,
          payoutStatus: r.payoutStatus,
          // Extra values needed for card layouts
          title: r.matchId?.title,
          game: r.matchId?.game,
          map: r.matchId?.map,
          mapType: r.matchId?.mapType || 'BigMap',
          clashSquadFormat: r.matchId?.clashSquadFormat || 'N/A',
          mode: r.matchId?.mode,
          startTime: r.matchId?.startTime,
          entryFee: r.matchId?.entryFee,
          organizerName: r.matchId?.organizerId?.fullName || 'Host',
          roomDetails: r.matchId?.roomDetails
        }));
        setRegistrations(formatted);
      }
    } catch (error) {
      console.error('Fetch joined matches error:', error);
    }
  };

  // Fetch initial data on mount
  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchMatches();
    };
    init();
  }, []);

  // Fetch user notifications
  const fetchNotifications = async () => {
    if (!localStorage.getItem('skyarena_token')) return;
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  };

  // Mark a specific notification as read
  const markNotificationRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  };

  // Mark all unread notifications as read
  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
      }
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/clear`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Clear notifications error:', error);
    }
  };

  // Fetch transactions, registrations and notifications when user session updates
  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchJoinedMatches();
      fetchNotifications();
    } else {
      setTransactions([]);
      setRegistrations([]);
      setNotifications([]);
    }
  }, [user]);

  // Polling loop for active user
  useEffect(() => {
    if (!user) return;
    
    // Poll every 20 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchProfile();
    }, 20000);

    return () => clearInterval(interval);
  }, [user]);

  // Auth: Login
  const loginUser = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('skyarena_token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Auth: Register
  const registerUser = async (name, email, phone, password, referralCode) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, referralCode })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('skyarena_token', data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Registration failed.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Auth: Verify referral code
  const verifyReferral = async (referralCode) => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode })
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Verification failed.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Auth: Load registrations for a match
  const loadMatchRegistrations = async (matchId) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/registrations`);
      const data = await res.json();
      if (data.success) {
        const formatted = data.registrations.map(r => ({
          registrationId: r._id,
          matchId: r.matchId?._id || r.matchId,
          userId: r.userId?._id || r.userId,
          teamName: r.teamName,
          inGameCharacterId: r.inGameCharacterId,
          inGameName: r.inGameName,
          slotNumber: r.slotNumber,
          teamNumber: r.teamNumber,
          teamSlotPosition: r.teamSlotPosition,
          payoutStatus: r.payoutStatus,
          matchStats: r.matchStats || { kills: 0, position: null, disqualified: false }
        }));
        
        // Merge into registrations state, avoiding duplicates
        setRegistrations(prev => {
          const filteredPrev = prev.filter(p => p.matchId !== matchId);
          return [...filteredPrev, ...formatted];
        });
        
        return formatted;
      }
      return [];
    } catch (error) {
      console.error('Fetch match registrations error:', error);
      return [];
    }
  };

  // Auth: Logout
  const logoutUser = () => {
    localStorage.removeItem('skyarena_token');
    setUser(null);
  };

  // Developer Simulation Reset (Refreshes client and instructs backend)
  const resetDatabase = () => {
    localStorage.removeItem('skyarena_token');
    setUser(null);
    alert("To reset the backend MongoDB database, run 'npm run seed' in your backend terminal. The client will now refresh.");
    window.location.reload();
  };

  // Dev Cheat Helper: Toggle organizer status
  const switchUserRole = async (role) => {
    try {
      const updatedUser = { ...user, isOrganizer: role === 'host' };
      setUser(updatedUser);
    } catch (error) {
      console.error(error);
    }
  };

  // Sync IGN and Character ID
  const linkGameIdentity = async (game, characterId, inGameName) => {
    try {
      const res = await fetch(`${API_URL}/wallet/link-identity`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ game, characterId, inGameName })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => ({
          ...prev,
          identities: data.identities
        }));
        alert('Character identity synced successfully!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to connect to server.');
    }
  };

  // Wallet deposits via Razorpay
  const depositFunds = async (amount) => {
    try {
      const cleanAmount = parseFloat(amount);
      if (isNaN(cleanAmount) || cleanAmount <= 0) return false;

      // 1. Create Razorpay order ID on backend
      const res = await fetch(`${API_URL}/payment/order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount: cleanAmount })
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.message || 'Payment server error.');
        return false;
      }

      const { keyId, order } = data;

      // 2. Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SkyArena Escrow',
        description: `Add ₹${cleanAmount.toFixed(0)} deposit cash`,
        order_id: order.id,
        handler: async (response) => {
          // 3. Cryptographically verify signature on payment success
          try {
            const verifyRes = await fetch(`${API_URL}/payment/verify`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: cleanAmount
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              setUser(prev => ({
                ...prev,
                wallet: verifyData.wallet
              }));
              await fetchTransactions();
              alert(`Payment successful! ₹${cleanAmount.toFixed(0)} added to wallet.`);
            } else {
              alert(verifyData.message || 'Signature verification failed.');
            }
          } catch (error) {
            alert('Failed to verify payment with server.');
          }
        },
        prefill: {
          name: user.fullName,
          email: user.email,
          contact: user.phoneNumber
        },
        theme: { color: '#0ea5e9' }
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK script not loaded. Please verify your internet connection or disable any adblocker');
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
      return true;

    } catch (error) {
      console.error('Deposit error:', error);
      alert(`Failed to initiate Razorpay checkout: ${error.message}. Please verify your server is running, check your internet connection, or disable any adblocker.`);
      return false;
    }
  };

  // Wallet cashout request (marked as 'Processing')
  const withdrawFunds = async (amount, upiId) => {
    try {
      const res = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, upiId })
      });
      const data = await res.json();

      if (data.success) {
        setUser(prev => ({
          ...prev,
          wallet: data.wallet
        }));
        await fetchTransactions();
        alert(data.message);
        return true;
      } else {
        alert(data.message || 'Withdrawal failed.');
        return false;
      }
    } catch (error) {
      alert(`Failed to submit withdrawal: ${error.message}`);
      return false;
    }
  };

  // Join match slot
  const joinMatch = async (matchId, teamName = "", slotDetails = null) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          teamName,
          slotNumber: slotDetails?.slotNumber,
          teamNumber: slotDetails?.teamNumber,
          teamSlotPosition: slotDetails?.teamSlotPosition
        })
      });
      const data = await res.json();

      if (data.success) {
        await fetchProfile();      // Update wallet balance
        await fetchMatches();      // Update booking slot counts
        await fetchJoinedMatches(); // Update player timetables
        await fetchTransactions();  // Sync logs
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to join match.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Organizer: Create match
  const createMatch = async (matchData) => {
    try {
      const res = await fetch(`${API_URL}/tournaments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(matchData)
      });
      const data = await res.json();

      if (data.success) {
        await fetchMatches();
        return true;
      } else {
        alert(data.message || 'Failed to create match.');
        return false;
      }
    } catch (error) {
      alert('Server connection error.');
      return false;
    }
  };

  // Organizer: Edit match details
  const updateMatch = async (matchId, editData) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editData)
      });
      const data = await res.json();
      if (data.success) {
        await fetchMatches();
        alert('Tournament updated successfully!');
        return true;
      } else {
        alert(data.message || 'Failed to update tournament.');
        return false;
      }
    } catch (error) {
      alert('Server connection error.');
      return false;
    }
  };

  // Organizer: Dispatch room credentials
  const dispatchRoomDetails = async (matchId, roomId, roomPass) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/credentials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ roomId, roomPass })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMatches();
        alert('Room credentials dispatched successfully!');
        return true;
      } else {
        alert(data.message || 'Failed to send credentials.');
        return false;
      }
    } catch (error) {
      alert('Failed to connect to server.');
      return false;
    }
  };

  // Organizer: Set match live
  const setMatchLive = async (matchId) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/live`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchMatches();
        alert('Match launched live!');
        return true;
      } else {
        alert(data.message || 'Failed to launch live.');
        return false;
      }
    } catch (error) {
      alert('Failed to connect to server.');
      return false;
    }
  };

  // Organizer: Submit single match standings
  const completeSingleMatch = async (matchId, standingsList) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ standingsList })
      });
      const data = await res.json();
      if (data.success) {
        await fetchProfile();
        await fetchMatches();
        await fetchTransactions();
        alert('Standings resolved and payouts released!');
        return true;
      } else {
        alert(data.message || 'Failed to resolve standings.');
        return false;
      }
    } catch (error) {
      alert('Failed to connect to server.');
      return false;
    }
  };

  // Organizer: Cancel match & process refunds
  const cancelMatch = async (matchId, cancelReason) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: cancelReason })
      });
      const data = await res.json();
      if (data.success) {
        await fetchProfile();
        await fetchMatches();
        await fetchTransactions();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to cancel match.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Lucky Draw Spin Wheel daily spin logging
  const addSpinWinnings = async (amount) => {
    try {
      const res = await fetch(`${API_URL}/wallet/spin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => ({
          ...prev,
          wallet: data.wallet
        }));
        await fetchTransactions();
      } else {
        alert(data.message || 'Failed to claim spin reward.');
      }
    } catch (error) {
      alert('Failed to connect to server.');
    }
  };

  // Rewards shop checkout
  const redeemReward = async (productName, costInr) => {
    try {
      const res = await fetch(`${API_URL}/wallet/redeem`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productName, costInr })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => ({
          ...prev,
          wallet: data.wallet
        }));
        await fetchTransactions();
        return { success: true, message: `Successfully redeemed ${productName}! Voucher code: ${data.voucherCode}` };
      } else {
        return { success: false, message: data.message || 'Failed to redeem reward.' };
      }
    } catch (error) {
      return { success: false, message: 'Server connection failed.' };
    }
  };

  // Fetch leaderboard payouts from server
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/leaderboard`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        return data.leaderboard;
      }
      return [];
    } catch (error) {
      console.error('Fetch leaderboard error:', error);
      return [];
    }
  };

  // Fetch real referrals invite list from server
  const fetchReferrals = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/referrals`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        return {
          referralCode: data.referralCode,
          referrals: data.referrals
        };
      }
      return { referralCode: '', referrals: [] };
    } catch (error) {
      console.error('Fetch referrals error:', error);
      return { referralCode: '', referrals: [] };
    }
  };

  return (
    <DBContext.Provider value={{
      user,
      matches,
      registrations,
      loadMatchRegistrations,
      transactions,
      switchUserRole,
      linkGameIdentity,
      depositFunds,
      withdrawFunds,
      joinMatch,
      createMatch,
      updateMatch,
      dispatchRoomDetails,
      setMatchLive,
      completeSingleMatch,
      cancelMatch,
      loginUser,
      registerUser,
      verifyReferral,
      logoutUser,
      addSpinWinnings,
      redeemReward,
      fetchLeaderboard,
      fetchReferrals,
      showSpinOverlay,
      setShowSpinOverlay,
      resetDatabase,
      notifications,
      fetchNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      clearAllNotifications,
      loading
    }}>
      {!loading && children}
    </DBContext.Provider>
  );
};

export const useDB = () => useContext(DBContext);
