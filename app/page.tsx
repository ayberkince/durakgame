"use client";
import React, { useState, useEffect } from 'react';
import Profile from './Profile';
import PrivateGamesList from './PrivateGamesList';
import CreateGame from './CreateGame';
import GameBoard from './GameBoard';
import TestRunner from './TestRunner';
import { socket } from './socket';
import { getProfile, saveProfile, UserProfile } from './identity';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  const [currentTab, setCurrentTab] = useState('private');
  const [gameSettings, setGameSettings] = useState<any>(null);

  // 1. Check for profile on boot AND handle socket connection
  // 1. Check for profile on boot AND handle socket connection
  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setUserProfile(profile);
      socket.connect();
    }

    // --- NEW: Listen for successful connections and check for active games ---
    const onConnect = () => {
      socket.emit('check_session', (response: any) => {
        if (response.inGame) {
          console.log("Resuming active match...");
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

  // 2. Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim().length < 3) return alert('Username must be at least 3 characters.');

    const newProfile = saveProfile(usernameInput.trim());
    setUserProfile(newProfile);
    socket.connect(); // Connect to network AFTER profile is created
  };

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

  // 3. THE ONBOARDING SCREEN
  if (!userProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black p-6">
        <div className="w-full max-w-sm bg-black/40 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl text-center relative overflow-hidden">
          {/* Decorative Background Glow */}
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

  // 4. THE MAIN APP (If logged in)
  return (
    <div className="flex justify-center items-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black text-zinc-100 font-sans selection:bg-amber-500/30">
      <div className="w-full h-[100dvh] md:w-[400px] md:h-[800px] bg-black/40 backdrop-blur-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative border-x-0 md:border border-white/10 ring-0 md:ring-1 md:ring-white/5">

        <div className="flex-none pt-12 pb-6 px-6 text-center relative z-10">
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-b-xl"></div>
          <h1 className="text-sm font-extrabold tracking-[0.2em] uppercase text-zinc-300 flex items-center justify-center gap-3">
            {currentTab === 'profile' && <><span className="text-amber-500">❖</span> DOSSIER</>}
            {currentTab === 'private' && <><span className="text-amber-500">❖</span> THE LOBBY</>}
            {currentTab === 'create' && <><span className="text-amber-500">❖</span> NEW MATCH</>}
            {currentTab === 'playing' && <><span className="text-amber-500">❖</span> THE TABLE</>}
            {currentTab === 'test' && <><span className="text-amber-500">❖</span> QA SYSTEM</>}
          </h1>
        </div>

        <div className="flex-grow overflow-y-auto px-6 pb-6 custom-scrollbar relative z-10">
          {currentTab === 'profile' && <Profile />}
          {currentTab === 'private' && <PrivateGamesList onJoin={joinMultiplayerRoom} />}
          {currentTab === 'create' && <CreateGame onStart={startLocalGame} />}
          {currentTab === 'playing' && <GameBoard settings={gameSettings} onLeave={() => setCurrentTab('private')} />}
          {currentTab === 'test' && <TestRunner />}
        </div>

        {currentTab !== 'playing' && (
          <div className="flex-none flex justify-around p-5 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 text-[10px] uppercase tracking-widest font-bold z-20 pb-8 md:pb-5">
            <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center gap-2 transition-all duration-300 ${currentTab === 'profile' ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-zinc-600 hover:text-zinc-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Profile
            </button>
            <button onClick={() => setCurrentTab('private')} className={`flex flex-col items-center gap-2 transition-all duration-300 ${currentTab === 'private' ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-zinc-600 hover:text-zinc-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Private
            </button>
            <button onClick={() => setCurrentTab('create')} className={`flex flex-col items-center gap-2 transition-all duration-300 ${currentTab === 'create' ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-zinc-600 hover:text-zinc-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create
            </button>
            <button onClick={() => setCurrentTab('test')} className={`flex flex-col items-center gap-2 transition-all duration-300 ${currentTab === 'test' ? 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-zinc-600 hover:text-zinc-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}