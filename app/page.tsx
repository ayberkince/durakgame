'use client';

import React from 'react';
import {
  Gem,
  Banknote,
  Users,
  Lock,
  ChevronRight,
  ArrowRightLeft,
  Sparkles,
  Star,
  RefreshCw,
  Handshake,
  Equal,
  Maximize,
  Search,
  PlusCircle,
  User,
  Shield
} from 'lucide-react';

// --- Types ---
type GameRule = 'throw-in' | 'neighbors' | 'with-tricks' | 'classic' | 'passing' | 'all' | 'fair-play' | 'draw';

interface GameRoom {
  id: string;
  hostName: string;
  betAmount: string;
  currentPlayers: number;
  maxPlayers: number;
  deckSize: 24 | 36 | 52;
  isPrivate: boolean;
  rules: GameRule[];
}

// --- Mock Data ---
const MOCK_ROOMS: GameRoom[] = [
  {
    id: '1',
    hostName: '***',
    betAmount: '1K',
    currentPlayers: 1,
    maxPlayers: 2,
    deckSize: 24,
    isPrivate: true,
    rules: ['throw-in', 'neighbors', 'with-tricks'],
  },
  {
    id: '2',
    hostName: 'нет',
    betAmount: '250',
    currentPlayers: 1,
    maxPlayers: 3,
    deckSize: 36,
    isPrivate: true,
    rules: ['passing', 'throw-in', 'classic'],
  },
  {
    id: '3',
    hostName: 'Павел Сухарев',
    betAmount: '1K',
    currentPlayers: 1,
    maxPlayers: 5,
    deckSize: 52,
    isPrivate: true,
    rules: ['passing', 'with-tricks', 'classic'],
  },
  {
    id: '4',
    hostName: 'Торфін',
    betAmount: '500',
    currentPlayers: 1,
    maxPlayers: 2,
    deckSize: 24,
    isPrivate: true,
    rules: ['classic', 'fair-play'],
  },
  {
    id: '5',
    hostName: 'Сункар',
    betAmount: '250',
    currentPlayers: 1,
    maxPlayers: 3,
    deckSize: 24,
    isPrivate: true,
    rules: ['passing', 'fair-play', 'draw'],
  },
  {
    id: '6',
    hostName: 'Horti4ka',
    betAmount: '100',
    currentPlayers: 1,
    maxPlayers: 2,
    deckSize: 36,
    isPrivate: true,
    rules: ['throw-in', 'fair-play'],
  },
  {
    id: '7',
    hostName: 'deasaveaochilaplvasv',
    betAmount: '100',
    currentPlayers: 1,
    maxPlayers: 2,
    deckSize: 24,
    isPrivate: true,
    rules: ['throw-in', 'fair-play', 'draw'],
  },
];

// --- Helpers ---
const getRuleIcon = (rule: GameRule) => {
  switch (rule) {
    case 'throw-in': return <ArrowRightLeft className="w-3.5 h-3.5" />;
    case 'neighbors': return <Users className="w-3.5 h-3.5" />;
    case 'with-tricks': return <Sparkles className="w-3.5 h-3.5" />;
    case 'classic': return <Star className="w-3.5 h-3.5" />;
    case 'passing': return <RefreshCw className="w-3.5 h-3.5" />;
    case 'all': return <Maximize className="w-3.5 h-3.5" />;
    case 'fair-play': return <Handshake className="w-3.5 h-3.5" />;
    case 'draw': return <Equal className="w-3.5 h-3.5" />;
    default: return null;
  }
};

// --- Sub-components ---

const RoomListItem = ({ room }: { room: GameRoom }) => {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 mb-3 hover:bg-slate-800/60 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          {room.isPrivate && (
            <div className="bg-slate-900/80 p-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
          <span className="text-slate-200 font-semibold text-sm truncate max-w-[140px]">
            {room.hostName}
          </span>
        </div>
        <div className="bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md flex items-center">
          <span className="text-indigo-300 text-xs font-bold">{room.deckSize}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Bet */}
          <div className="flex items-center space-x-1.5">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold">{room.betAmount}</span>
          </div>
          
          {/* Players */}
          <div className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 font-medium text-sm">
              {room.currentPlayers}<span className="text-slate-500">/{room.maxPlayers}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Rules Icons */}
          <div className="flex items-center space-x-1.5">
            {room.rules.map((rule, idx) => (
              <div key={idx} className="text-slate-400 bg-slate-900/50 p-1 rounded-md">
                {getRuleIcon(rule)}
              </div>
            ))}
          </div>
          
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};

// --- Main Screen ---

export default function GameLobbyScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4 font-sans">
      {/* Mobile Device Mockup Container */}
      <div className="w-full max-w-[400px] h-[850px] max-h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-slate-800 relative flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">Private games</h1>
          </div>
          <div className="bg-amber-500/20 p-2 rounded-full">
            <Gem className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 scrollbar-hide">
          {MOCK_ROOMS.map((room) => (
            <RoomListItem key={room.id} room={room} />
          ))}
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-6 py-4 flex justify-between items-center pb-8">
          <button className="flex flex-col items-center text-slate-500 hover:text-slate-300 transition-colors">
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
          <button className="flex flex-col items-center text-slate-500 hover:text-slate-300 transition-colors">
            <Search className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Opened</span>
          </button>
          <button className="flex flex-col items-center text-indigo-400">
            <Lock className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Private</span>
          </button>
          <button className="flex flex-col items-center text-slate-500 hover:text-slate-300 transition-colors">
            <PlusCircle className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Create</span>
          </button>
        </div>

      </div>
    </div>
  );
}
