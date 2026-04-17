"use client";
import { useState, useEffect } from 'react';
import { socket } from './socket';
import { getProfile } from './identity';

export function useDurak(settings: any) {
    const [gameState, setGameState] = useState<any>(null);
    const [humanId, setHumanId] = useState<number | null>(null);
    const [activeEmojis, setActiveEmojis] = useState<Record<string, string>>({});

    useEffect(() => {
        // --- 1. HANDLE GAME STATE UPDATES ---
        const handleUpdate = (state: any) => {
            setGameState(state);

            // Find which seat (0, 1, 2...) belongs to us based on our Profile ID
            const myProfile = getProfile();
            if (myProfile && state.players) {
                const me = state.players.find((p: any) =>
                    p.name.includes(myProfile.username) ||
                    p.name.includes(myProfile.id.substring(0, 4))
                );

                if (me) setHumanId(me.id);
            }
        };

        // --- 2. HANDLE EMOJI REACTIONS ---
        const handleEmoji = ({ userId: senderId, emoji }: { userId: string, emoji: string }) => {
            // Add emoji to the specific player's slot
            setActiveEmojis(prev => ({ ...prev, [senderId]: emoji }));

            // Auto-remove after 3 seconds to keep the board clean
            setTimeout(() => {
                setActiveEmojis(prev => {
                    const newState = { ...prev };
                    delete newState[senderId];
                    return newState;
                });
            }, 3000);
        };

        // Connect Listeners
        socket.on('game_state_update', handleUpdate);
        socket.on('new_emoji', handleEmoji);

        // Cleanup on unmount
        return () => {
            socket.off('game_state_update', handleUpdate);
            socket.off('new_emoji', handleEmoji);
        };
    }, []);

    // --- ACTIONS ---
    const playCard = (card: any) => {
        socket.emit('play_card', { roomId: settings.roomId, card });
        return true; // Used for UI feedback
    };

    const passOrTake = () => {
        socket.emit('pass_or_take', { roomId: settings.roomId });
    };

    const sendEmoji = (emoji: string) => {
        socket.emit('send_emoji', { roomId: settings.roomId, emoji });
    };

    return {
        gameState,
        playCard,
        passOrTake,
        sendEmoji,
        activeEmojis,
        HUMAN_ID: humanId
    };
}