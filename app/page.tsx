"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Component Imports
import Profile from './Profile';
import PrivateGamesList from './PrivateGamesList';
import CreateGame from './CreateGame';
import GameBoard from './GameBoard';
import Leaderboard from './Leaderboard';
import DossierLogin from './DossierLogin';

// Engine & Network
import { socket } from './socket';
import { getProfile, saveProfile, UserProfile } from './identity';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState('private');
  const [gameSettings, setGameSettings] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  // 1. BOOT SEQUENCE & HEARTBEAT PROTOCOL
  useEffect(() => {
    const profile = getProfile();

    // Register listeners BEFORE connecting
    const onConnect = () => {
      console.log("⚡ [NETWORK] Encryption Handshake Verified");

      // Check for an active session
      socket.emit('check_session', (response: any) => {
        if (response.inGame) {
          setGameSettings({ ...response.settings, roomId: response.roomId });
          setCurrentTab('playing');
        }
      });

      // Start Ping loop
      const pingInterval = setInterval(() => {
        socket.emit('ping_server', Date.now());
      }, 5000);

      return () => clearInterval(pingInterval);
    };

    const onPong = (startTime: number) => {
      setLatency(Date.now() - startTime);
    };

    const onConnectError = (err: any) => {
      console.error("❌ Socket Connection Error:", err.message);
    };

    socket.on('connect', onConnect);
    socket.on('pong_server', onPong);
    socket.on('connect_error', onConnectError);

    if (profile) {
      setUserProfile(profile);
      socket.auth = { profile };
      socket.connect();
    }

    setIsReady(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('pong_server', onPong);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  // 2. MATCHMAKING HANDLERS
  const handleStartMatch = (settings: any) => {
    if (settings === 'go_to_lobby') {
      setCurrentTab('private');
    } else {
      setGameSettings(settings);
      setCurrentTab('playing');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    socket.emit('join_room', roomId, (response: any) => {
      if (response.success) {
        setGameSettings({ ...response.settings, roomId });
        setCurrentTab('playing');
      } else {
        alert(response.error || "Access Denied.");
      }
    });
  };

  if (!isReady) return null;

  // Inside App() -> 3. AUTHORIZATION GATE
  // Inside App component -> 3. AUTHORIZATION GATE
  if (!userProfile) {
    return (
      <DossierLogin
        onAuthorized={(response) => {
          const profile = response.profile || { username: response.username, id: response.userId };
          if (profile?.username) saveProfile(profile.username);

          setUserProfile(profile);
          socket.auth = { profile };
          socket.connect(); // This triggers the useEffect listeners above
          setCurrentTab('private');
        }}
      />
    );
  }

  // 4. MAIN EXECUTIVE INTERFACE
  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-950 text-zinc-100 selection:bg-amber-500/30 overflow-hidden font-sans">

      {/* The Central Intelligence Frame */}
      <div className="w-full h-[100dvh] md:max-w-[420px] md:max-h-[850px] bg-zinc-900/10 md:border md:border-white/5 md:rounded-[3.5rem] shadow-2xl flex flex-col relative backdrop-blur-3xl overflow-hidden md:ring-1 md:ring-white/5">

        {/* Dynamic Nav Header */}
        <div className="flex-none pt-14 pb-6 px-10 text-center relative z-10">
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-zinc-800 rounded-b-2xl opacity-20"></div>

          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>

            <h1 className="text-[9px] font-black tracking-[0.5em] uppercase text-zinc-600">
              {currentTab === 'profile' && "Agent Dossier"}
              {currentTab === 'private' && "Operational Lobby"}
              {currentTab === 'create' && "Initialize Match"}
              {currentTab === 'playing' && "Active Table"}
              {currentTab === 'leaderboard' && "Global Ranks"}
            </h1>

            {/* 🔥 LATENCY INDICATOR */}
            {latency !== null && (
              <span className={`text-[8px] font-mono transition-colors duration-500 ${latency < 80 ? 'text-emerald-500/40' :
                latency < 150 ? 'text-amber-500/40' : 'text-rose-500/40'
                }`}>
                {latency}MS
              </span>
            )}
          </motion.div>
        </div>

        {/* Viewport Content */}
        <div className="flex-grow overflow-y-auto px-6 pb-6 custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentTab === 'profile' && <Profile />}
              {currentTab === 'private' && <PrivateGamesList onJoin={handleJoinRoom} />}
              {currentTab === 'create' && <CreateGame onStart={handleStartMatch} />}
              {currentTab === 'playing' && <GameBoard settings={gameSettings} onLeave={() => setCurrentTab('private')} />}
              {currentTab === 'leaderboard' && <Leaderboard />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Nav Controller */}
        {currentTab !== 'playing' && (
          <div className="flex-none flex justify-around p-6 bg-zinc-950/80 backdrop-blur-3xl border-t border-white/5 z-20 pb-12 md:pb-8">
            <NavBtn icon="dossier" active={currentTab === 'profile'} onClick={() => setCurrentTab('profile')} label="Dossier" />
            <NavBtn icon="lobby" active={currentTab === 'private'} onClick={() => setCurrentTab('private')} label="Lobby" />
            <NavBtn icon="deploy" active={currentTab === 'create'} onClick={() => setCurrentTab('create')} label="Deploy" />
            <NavBtn icon="ranks" active={currentTab === 'leaderboard'} onClick={() => setCurrentTab('leaderboard')} label="Ranks" />
          </div>
        )}
      </div>

      {/* Atmospheric FX */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-600/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
}

function NavBtn({ icon, active, onClick, label }: any) {
  const icons: any = {
    dossier: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    lobby: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    deploy: "M12 4v16m8-8H4",
    ranks: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 transition-all group ${active ? 'text-amber-500' : 'text-zinc-700 hover:text-zinc-500'}`}
    >
      <svg className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'group-hover:scale-105'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icons[icon]} />
      </svg>
      <span className="text-[8px] font-black uppercase tracking-[0.25em]">{label}</span>
    </button>
  );
}