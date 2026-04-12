"use client";

import React, { useState } from 'react';
import PrivateGamesList from './PrivateGamesList';
import CreateGame from './CreateGame';
import GameBoard from './GameBoard';
import TestRunner from './TestRunner';

export default function App() {
  const [currentTab, setCurrentTab] = useState('private'); // 'private', 'create', 'playing', 'test'
  const [gameSettings, setGameSettings] = useState<any>(null);

  // This function simulates starting a game locally
  const startLocalGame = (settings: any) => {
    setGameSettings(settings);
    setCurrentTab('playing');
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 text-white font-sans">
      {/* Mobile Phone Wrapper */}
      <div className="w-[400px] h-[800px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border-4 border-slate-800">

        {/* TOP HEADER */}
        <div className="flex-none p-6 text-center border-b border-slate-700 bg-slate-800">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <span className="text-blue-400">🛡️</span>
            {currentTab === 'private' && "Private Games"}
            {currentTab === 'create' && "Create Game"}
            {currentTab === 'playing' && "Durak Table"}
            {currentTab === 'test' && "QA Tester"}
          </h1>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
          {currentTab === 'private' && <PrivateGamesList />}
          {currentTab === 'create' && <CreateGame onStart={startLocalGame} />}
          {currentTab === 'playing' && <GameBoard settings={gameSettings} onLeave={() => setCurrentTab('private')} />}
          {currentTab === 'test' && <TestRunner />}
        </div>

        {/* BOTTOM NAVIGATION (Only show if not playing) */}
        {currentTab !== 'playing' && (
          <div className="flex-none flex justify-around p-4 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
            <button className="flex flex-col items-center hover:text-white transition-colors">
              <span className="text-xl mb-1">👤</span> Profile
            </button>
            <button
              onClick={() => setCurrentTab('private')}
              className={`flex flex-col items-center transition-colors ${currentTab === 'private' ? 'text-blue-400' : 'hover:text-white'}`}
            >
              <span className="text-xl mb-1">🔒</span> Private
            </button>
            <button
              onClick={() => setCurrentTab('create')}
              className={`flex flex-col items-center transition-colors ${currentTab === 'create' ? 'text-pink-500' : 'hover:text-white'}`}
            >
              <span className="text-xl mb-1">➕</span> Create
            </button>
            <button
              onClick={() => setCurrentTab('test')}
              className={`flex flex-col items-center transition-colors ${currentTab === 'test' ? 'text-purple-400' : 'hover:text-white'}`}
            >
              <span className="text-xl mb-1">🧪</span> QA
            </button>
          </div>
        )}

      </div>
    </div>
  );
}