"use client";
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface PlayingCardProps extends HTMLMotionProps<"div"> {
    card?: { suite: number; rank: number; hidden?: boolean };
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
    ...motionProps
}: PlayingCardProps) {

    const getCardImageUrl = () => {
        // If the server explicitly says it's hidden, or the component flags it face down
        if (isFaceDown || !card || card.hidden) {
            return "https://deckofcardsapi.com/static/img/back.png";
        }

        const suits = { 1: 'C', 2: 'D', 3: 'H', 4: 'S' };
        const ranks = { 10: '0', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

        const suitStr = suits[card.suite as keyof typeof suits];
        const rankStr = ranks[card.rank as keyof typeof ranks] || card.rank.toString();

        return `https://deckofcardsapi.com/static/img/${rankStr}${suitStr}.png`;
    };

    return (
        <motion.div
            {...motionProps}
            className={`
                w-[70px] h-[100px] rounded-md shadow-2xl bg-contain bg-no-repeat bg-center
                transition-all duration-300 border border-white/10
                ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                ${isShaking ? 'animate-error-shake' : ''}
                ${interactive ? 'cursor-pointer hover:-translate-y-8 hover:scale-110 hover:z-50 hover:shadow-amber-500/20' : ''}
                ${className}
            `}
            style={{
                backgroundImage: `url(${getCardImageUrl()})`,
                ...motionProps.style
            }}
        />
    );
}