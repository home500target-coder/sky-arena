import React from 'react';
import { useDB } from '../context/DBContext';
import { 
  Bell, Key, Zap, Trophy, Coins, Gift, Trash2, CheckSquare, Eye 
} from 'lucide-react';

export default function NotificationsView() {
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    clearAllNotifications 
  } = useDB();

  const getIcon = (type) => {
    switch (type) {
      case 'RoomCredentials':
        return <Key className="notif-icon-style room-creds" size={18} />;
      case 'MatchLive':
        return <Zap className="notif-icon-style match-live" size={18} />;
      case 'MatchCompleted':
        return <Trophy className="notif-icon-style match-completed" size={18} />;
      case 'WalletUpdate':
        return <Coins className="notif-icon-style wallet-update" size={18} />;
      case 'ReferralReward':
        return <Gift className="notif-icon-style referral" size={18} />;
      default:
        return <Bell className="notif-icon-style general" size={18} />;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notifications-panel-view">
      {/* Header controls */}
      <div className="notif-header-toolbar">
        <span className="unread-count-label">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </span>
        <div className="notif-action-buttons">
          {unreadCount > 0 && (
            <button className="notif-text-btn" onClick={markAllNotificationsRead} title="Mark all read">
              <CheckSquare size={14} style={{ marginRight: 4 }} />
              Read All
            </button>
          )}
          {notifications.length > 0 && (
            <button className="notif-text-btn delete" onClick={clearAllNotifications} title="Clear all notifications">
              <Trash2 size={14} style={{ marginRight: 4 }} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="notifications-scroll-list">
        {notifications.length === 0 ? (
          <div className="notifications-empty-state">
            <div className="empty-bell-glow">
              <Bell size={40} className="bell-fade" />
            </div>
            <h4>No notifications yet</h4>
            <p>You'll see match updates, credentials, and transaction alerts here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id} 
              className={`notification-item-card ${notif.isRead ? 'read' : 'unread'}`}
              onClick={() => !notif.isRead && markNotificationRead(notif._id)}
            >
              <div className="notif-card-left">
                <div className={`notif-icon-circle ${notif.type.toLowerCase()}`}>
                  {getIcon(notif.type)}
                </div>
              </div>
              <div className="notif-card-middle">
                <div className="notif-title-row">
                  <h5 className="notif-item-title">{notif.title}</h5>
                  {!notif.isRead && <span className="unread-pulse-dot"></span>}
                </div>
                <p className="notif-item-message">{notif.message}</p>
                <span className="notif-item-time">{formatTime(notif.createdAt)}</span>
              </div>
              {!notif.isRead && (
                <button 
                  className="mark-single-read-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    markNotificationRead(notif._id);
                  }}
                  title="Mark as read"
                >
                  <Eye size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
