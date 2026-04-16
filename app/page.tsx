"use client";
import React, { useState, useEffect } from 'react';
import Profile from './Profile';
import PrivateGamesList from './PrivateGamesList';
import CreateGame from './CreateGame';
import GameBoard from './GameBoard';
import Leaderboard from './Leaderboard'; // <-- NEW: Replaces TestRunner
import { socket } from './socket';
import { getProfile, saveProfile, UserProfile } from './identity';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [currentTab, setCurrentTab] = useState('private');
  const [gameSettings, setGameSettings] = useState<any>(null);

  // 1. IDENTITY & RECONNECTION (Phases 0 & 1)
  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setUserProfile(profile);
      socket.connect();
    }

    const onConnect = () => {
      // Ask the server if we have an active game in the database/RAM
      socket.emit('check_session', (response: any) => {
        if (response.inGame) {
          console.log("💼 Session recovered. Returning to table...");
          setGameSettings({ ...response.settings, roomId: response.roomId });
          setCurrentTab('playing');
        }
      });
    };

    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, []);

  // 2. ONBOARDING HANDLER
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length < 3) return alert('Username must be at least 3 characters.');

    const newProfile = saveProfile(usernameInput.trim());
    setUserProfile(newProfile);
    socket.connect();
  };

  // 3. NAVIGATION HANDLERS
  const startLocalGame = (settings: any) => {
    if (settings === 'go_to_lobby') {
      setCurrentTab('private');
    } else {
      setGameSettings(settings);
      setCurrentTab('playing');
    }
  };

  const joinMultiplayerRoom = (roomId: string) => {
    socket.emit('join_room', roomId, (response: any) => {
      if (response.success) {
        setGameSettings({ ...response.settings, roomId: roomId });
        setCurrentTab('playing');
      } else {
        alert(response.error);
      }
    });
  };

  // 4. ONBOARDING UI (EXECUTIVE STYLE)
  if (!userProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black p-6">
        <div className="w-full max-w-sm bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl"></div>
          <div className="w-20 h-20 bg-zinc-900 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative z-10">
            <span className="text-4xl">♠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-wide relative z-10">Durak Elite</h1>
          <p className="text-xs text-zinc-500 mb-8 uppercase tracking-widest relative z-10">Create Your Profile</p>
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter Alias..."
              maxLength={12}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-4 text-center text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
            />
            <button type="submit" className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-extrabold uppercase tracking-widest text-sm py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              Enter Lobby
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 5. MAIN APPLICATION SHELL
  return (
    <div className="flex justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black text-zinc-100 font-sans selection:bg-amber-500/30">

      {/* Container Frame */}
      <div className="w-full h-[100dvh] md:w-[400px] md:h-[800px] bg-black/40 backdrop-blur-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative border-x-0 md:border border-white/10 ring-0 md:ring-1 md:ring-white/5">

        {/* Top Header Label */}
        <div className="flex-none pt-12 pb-6 px-6 text-center relative z-10">
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-b-xl"></div>
          <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 flex items-center justify-center gap-3">
            <span className="text-amber-500">❖</span>
            {currentTab === 'profile' && "Dossier"}
            {currentTab === 'private' && "The Lobby"}
            {currentTab === 'create' && "New Match"}
            {currentTab === 'playing' && "The Table"}
            {currentTab === 'leaderboard' && "Ranks"}
          </h1>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-grow overflow-y-auto px-6 pb-6 custom-scrollbar relative z-10">
          {currentTab === 'profile' && <Profile />}
          {currentTab === 'private' && <PrivateGamesList onJoin={joinMultiplayerRoom} />}
          {currentTab === 'create' && <CreateGame onStart={startLocalGame} />}
          {currentTab === 'playing' && <GameBoard settings={gameSettings} onLeave={() => setCurrentTab('private')} />}
          {currentTab === 'leaderboard' && <Leaderboard />}
        </div>

        {/* Bottom Navigation (Hidden during active gameplay) */}
        {currentTab !== 'playing' && (
          <div className="flex-none flex justify-around p-5 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 z-20 pb-8 md:pb-5">
            <NavButton icon="profile" active={currentTab === 'profile'} onClick={() => setCurrentTab('profile')} label="Profile" />
            <NavButton icon="lobby" active={currentTab === 'private'} onClick={() => setCurrentTab('private')} label="Lobby" />
            <NavButton icon="create" active={currentTab === 'create'} onClick={() => setCurrentTab('create')} label="Create" />
            <NavButton icon="leaderboard" active={currentTab === 'leaderboard'} onClick={() => setCurrentTab('leaderboard')} label="Ranks" />
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for clean Navigation Buttons
function NavButton({ icon, active, onClick, label }: any) {
  const icons: any = {
    profile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    lobby: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
    create: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    leaderboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-zinc-600 hover:text-zinc-400'}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[icon]}</svg>
      <span className="text-[9px] uppercase font-bold tracking-widest">{label}</span>
    </button>
  );
}