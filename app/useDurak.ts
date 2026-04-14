"use client";
import { useState, useEffect } from 'react';
import { socket } from './socket';
import { getProfile } from './identity'; // <-- Make sure this is imported!

export function useDurak(settings: any) {
    const [gameState, setGameState] = useState<any>(null);
    const [humanId, setHumanId] = useState<number | null>(null);

    useEffect(() => {
        const handleUpdate = (state: any) => {
            setGameState(state);

            // 1. Get our persistent identity from LocalStorage
            const myProfile = getProfile();
            if (myProfile && state.players) {
                // 2. Find which Player ID on the server belongs to US
                // We check if the name matches our username OR our ID snippet
                const me = state.players.find((p: any) =>
                    p.name.includes(myProfile.username) ||
                    p.name.includes(myProfile.id.substring(0, 4))
                );

                if (me) {
                    setHumanId(me.id);
                }
            }
        };

        socket.on('game_state_update', handleUpdate);

        return () => {
            socket.off('game_state_update', handleUpdate);
        };
    }, []);

    const playCard = (card: any) => {
        // Send the move to the server
        socket.emit('play_card', { roomId: settings.roomId, card });
        return true;
    };

    const passOrTake = () => {
        socket.emit('pass_or_take', { roomId: settings.roomId });
    };

    return {
        gameState,
        playCard,
        passOrTake,
        HUMAN_ID: humanId
    };
}