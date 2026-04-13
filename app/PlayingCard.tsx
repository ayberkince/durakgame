"use client";
import React from 'react';

interface PlayingCardProps {
    card?: { suite: number; rank: number };
    isFaceDown?: boolean;
    isShaking?: boolean;
    isDimmed?: boolean;
    onClick?: () => void;
    className?: string;
    interactive?: boolean; // True if it's in our hand so it hovers
}

export default function PlayingCard({
    card,
    isFaceDown,
    isShaking,
    isDimmed,
    onClick,
    className = "",
    interactive = false
}: PlayingCardProps) {

    // Map our engine's numbers to the CDN's image format
    const getCardImageUrl = () => {
        if (isFaceDown || !card) return "https://deckofcardsapi.com/static/img/back.png";

        const suits = { 1: 'C', 2: 'D', 3: 'H', 4: 'S' };
        // The CDN uses '0' for 10
        const ranks = { 10: '0', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

        const suitStr = suits[card.suite as keyof typeof suits];
        const rankStr = ranks[card.rank as keyof typeof ranks] || card.rank.toString();

        return `https://deckofcardsapi.com/static/img/${rankStr}${suitStr}.png`;
    };

    return (
        <div
            onClick={onClick}
            className={`
                w-[70px] h-[100px] rounded-md shadow-xl bg-contain bg-no-repeat bg-center
                transition-all duration-200
                ${isDimmed ? 'opacity-50' : 'opacity-100'}
                ${isShaking ? 'animate-error-shake' : ''}
                ${interactive ? 'cursor-pointer hover:-translate-y-6 hover:z-50' : ''}
                ${className}
            `}
            style={{ backgroundImage: `url(${getCardImageUrl()})` }}
        />
    );
}