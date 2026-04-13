"use client";
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// We extend HTMLMotionProps so we can pass animation properties right into the card!
interface PlayingCardProps extends HTMLMotionProps<"div"> {
    card?: { suite: number; rank: number };
    isFaceDown?: boolean;
    isShaking?: boolean;
    isDimmed?: boolean;
    interactive?: boolean;
}

export default function PlayingCard({
    card,
    isFaceDown,
    isShaking,
    isDimmed,
    interactive = false,
    className = "",
    ...motionProps // Catch all the Framer Motion props like initial, animate, layout, etc.
}: PlayingCardProps) {

    const getCardImageUrl = () => {
        if (isFaceDown || !card) return "https://deckofcardsapi.com/static/img/back.png";

        const suits = { 1: 'C', 2: 'D', 3: 'H', 4: 'S' };
        const ranks = { 10: '0', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

        const suitStr = suits[card.suite as keyof typeof suits];
        const rankStr = ranks[card.rank as keyof typeof ranks] || card.rank.toString();

        return `https://deckofcardsapi.com/static/img/${rankStr}${suitStr}.png`;
    };

    return (
        <motion.div
            {...motionProps} // Inject the animations here!
            className={`
                w-[70px] h-[100px] rounded-md shadow-xl bg-contain bg-no-repeat bg-center
                transition-opacity duration-200 border-2 border-transparent
                ${isDimmed ? 'opacity-50' : 'opacity-100'}
                ${isShaking ? 'animate-error-shake' : ''}
                ${interactive ? 'cursor-pointer hover:-translate-y-6 hover:z-50' : ''}
                ${className}
            `}
            style={{
                backgroundImage: `url(${getCardImageUrl()})`,
                ...motionProps.style // Preserve any dynamic styles Framer needs
            }}
        />
    );
}