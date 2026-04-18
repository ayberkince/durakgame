"use client";
import React, { useState, useEffect } from 'react';
import Profile from './Profile';
import PrivateGamesList from './PrivateGamesList';
import CreateGame from './CreateGame';
import GameBoard from './GameBoard';
import Leaderboard from './Leaderboard';
import { socket } from './socket';
import { getProfile, saveProfile, UserProfile } from './identity';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [currentTab, setCurrentTab] = useState('private');
  const [gameSettings, setGameSettings] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // 1. IDENTITY & RECONNECTION 
  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setUserProfile(profile);
      socket.auth = { profile }; // Attach profile for socket handshake
      socket.connect();
    }

    const onConnect = () => {
      console.log("⚡ [NETWORK] Secure Link Established");
      // Check if this player is already in an active match on the server
      socket.emit('check_session', (response: any) => {
        if (response.inGame) {
          console.log("💼 Active session detected. Resuming protocol...");
          setGameSettings({ ...response.settings, roomId: response.roomId });
          setCurrentTab('playing');
        }
      });
    };

    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, []);

  // 2. DOSSIER ACCESS HANDLER
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length < 3) return;

    setIsConnecting(true);
    // Mimic the "Authenticating" feel of an executive terminal
    setTimeout(() => {
      const newProfile = saveProfile(usernameInput.trim());
      setUserProfile(newProfile);
      socket.auth = { profile: newProfile };
      socket.connect();
      setIsConnecting(false);
    }, 1000);
  };

  // 3. NAVIGATION & MATCHMAKING
  const startMatch = (settings: any) => {
    if (settings === 'go_to_lobby') {
      setCurrentTab('private');
    } else {
      setGameSettings(settings);
      setCurrentTab('playing');
    }
  };

  const joinMatch = (roomId: string) => {
    socket.emit('join_room', roomId, (response: any) => {
      if (response.success) {
        setGameSettings({ ...response.settings, roomId });
        setCurrentTab('playing');
      } else {
        alert(response.error || "Failed to join match.");
      }
    });
  };

  // 4. ONBOARDING GATE (EXECUTIVE STYLE)
  if (!userProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-950 p-6 selection:bg-amber-500/30">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-900 border border-amber-500/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl relative">
              <span className="text-4xl">♠️</span>
              <div className="absolute inset-0 rounded-[2rem] border border-amber-500/10 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.4em] text-amber-500">Durak Elite</h1>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Authorized Access Only</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toUpperCase())}
                placeholder="ENTER CODENAME"
                maxLength={12}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-4 py-5 text-center text-xs font-black uppercase tracking-[0.3em] text-white focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-zinc-800 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isConnecting || usernameInput.length < 3}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-20 text-black font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-600/10"
            >
              {isConnecting ? "Initializing Protocol..." : "Access Dossier"}
            </button>
          </form>

          <footer className="text-center pt-8">
            <p className="text-[8px] text-zinc-800 uppercase font-black tracking-tighter leading-relaxed">
              Global Economic Protocols in Effect<br />Database Persistence Active
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // 5. MAIN COMMAND CENTER
  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500/30 overflow-hidden">

      {/* Mobile-First Frame */}
      <div className="w-full h-[100dvh] md:max-w-[420px] md:max-h-[850px] bg-zinc-900/20 md:border md:border-white/5 md:rounded-[3rem] shadow-2xl flex flex-col relative backdrop-blur-3xl overflow-hidden">

        {/* Dynamic Header */}
        <div className="flex-none pt-12 pb-6 px-8 text-center relative z-10">
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-b-xl opacity-30"></div>
          <h1 className="text-[9px] font-black tracking-[0.4em] uppercase text-zinc-600 flex items-center justify-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            {currentTab === 'profile' && "Agent Dossier"}
            {currentTab === 'private' && "Secure Lobby"}
            {currentTab === 'create' && "Initialize Match"}
            {currentTab === 'playing' && "Active Table"}
            {currentTab === 'leaderboard' && "Global Ranks"}
          </h1>
        </div>

        {/* Viewport Content */}
        <div className="flex-grow overflow-y-auto px-6 pb-6 custom-scrollbar relative z-10">
          {currentTab === 'profile' && <Profile />}
          {currentTab === 'private' && <PrivateGamesList onJoin={joinMatch} />}
          {currentTab === 'create' && <CreateGame onStart={startMatch} />}
          {currentTab === 'playing' && <GameBoard settings={gameSettings} onLeave={() => setCurrentTab('private')} />}
          {currentTab === 'leaderboard' && <Leaderboard />}
        </div>

        {/* Nav Controller (Hidden during table sessions) */}
        {currentTab !== 'playing' && (
          <div className="flex-none flex justify-around p-6 bg-zinc-950/60 backdrop-blur-3xl border-t border-white/5 z-20 pb-10 md:pb-6">
            <NavBtn id="profile" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" active={currentTab === 'profile'} onClick={() => setCurrentTab('profile')} label="Dossier" />
            <NavBtn id="private" icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" active={currentTab === 'private'} onClick={() => setCurrentTab('private')} label="Lobby" />
            <NavBtn id="create" icon="M12 4v16m8-8H4" active={currentTab === 'create'} onClick={() => setCurrentTab('create')} label="Deploy" />
            <NavBtn id="leaderboard" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" active={currentTab === 'leaderboard'} onClick={() => setCurrentTab('leaderboard')} label="Ranks" />
          </div>
        )}
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-500/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}

// Nav Button Component
function NavBtn({ icon, active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all group ${active ? 'text-amber-500' : 'text-zinc-700 hover:text-zinc-500'}`}>
      <svg className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} />
      </svg>
      <span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}