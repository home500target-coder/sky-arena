import React, { useState, useEffect } from 'react';
import { Megaphone, RefreshCw, Calendar, CheckSquare, Bell, ArrowRight, Trophy } from 'lucide-react';
import { useDB } from '../context/DBContext';

export default function PlayView({ setView, setSelectedGame }) {
  const { user, matches } = useDB();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock announcement text
  const announcement = "SkyArena app launch details: August Tournament season open for registrations. Sign up now!";

  // Carousel banners
  const banners = [
    {
      id: 1,
      image: "/img/bgmi.avif",
      title: "BGMI Ultimate Battle",
      subtitle: "Join the Daily Scrims and win Cash Prizes"
    },
    {
      id: 2,
      image: "/img/freefire.avif",
      title: "Free Fire Max Cup",
      subtitle: "Compete in Solo Bermuda Rooms and win ₹100"
    }
  ];

  // Auto loop carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleGameSelect = (gameKey) => {
    setSelectedGame(gameKey);
    setView('gameLobbies');
  };

  return (
    <div className="play-view-container">
      {/* Announcement Bar */}
      <div className="announcement-ticker-bar">
        <div className="ticker-icon">
          <Megaphone size={16} />
        </div>
        <div className="ticker-text-wrapper">
          <div className="ticker-text">{announcement}</div>
        </div>
      </div>

      {/* Banner Carousel */}
      <div className="banner-carousel">
        <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {banners.map((banner) => (
            <div className="carousel-slide" key={banner.id}>
              <img src={banner.image} alt={banner.title} className="slide-bg-img" />
              <div className="slide-content-overlay">
                <span className="slide-badge">IN 2026</span>
                <h3 className="slide-title">BEST TOURNAMENT PLATFORM</h3>
                <p className="slide-subtitle">{banner.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Carousel Indicators */}
        <div className="carousel-indicators">
          {banners.map((_, idx) => (
            <span 
              key={idx} 
              className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>
      </div>

      {/* My Matches Section */}
      <div className="matches-quick-panel">
        <h4 className="section-label">My Matches</h4>
        <div className="status-buttons-grid">
          <button className="status-btn" onClick={() => setView('myMatches')}>
            <div className="status-icon-box bg-green">
              <RefreshCw size={20} className="icon-spin-hover" />
            </div>
            <span>Ongoing</span>
          </button>
          
          <button className="status-btn" onClick={() => setView('myMatches')}>
            <div className="status-icon-box bg-cyan">
              <Calendar size={20} />
            </div>
            <span>Upcoming</span>
          </button>
          
          <button className="status-btn" onClick={() => setView('myMatches')}>
            <div className="status-icon-box bg-emerald">
              <CheckSquare size={20} />
            </div>
            <span>Completed</span>
          </button>
        </div>
      </div>

      {/* Esports Games List */}
      <div className="esports-games-panel">
        <h4 className="section-label">ESports Games</h4>
        <div className="games-posters-grid">
          
          {/* BGMI Game card */}
          <div className="game-poster-card" onClick={() => handleGameSelect('bgmi')}>
            <div className="poster-image-wrapper">
              <img src="/img/bgmi.avif" alt="BGMI" />
              <div className="poster-badge-live">
                <span className="live-dot"></span>
                <span>Active</span>
              </div>
            </div>
            <div className="poster-footer">
              <h5>Battlegrounds Mobile India</h5>
              <div className="poster-action-arrow">
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

          {/* Free Fire Max Game card */}
          <div className="game-poster-card" onClick={() => handleGameSelect('freefire')}>
            <div className="poster-image-wrapper">
              <img src="/img/freefire.avif" alt="Free Fire Max" />
              <div className="poster-badge-live">
                <span className="live-dot"></span>
                <span>Active</span>
              </div>
            </div>
            <div className="poster-footer">
              <h5>Garena Free Fire Max</h5>
              <div className="poster-action-arrow">
                <ArrowRight size={14} />
              </div>
            </div>
          </div>

        </div>
      </div>



    </div>
  );
}
