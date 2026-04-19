"use client";
import React from 'react';

interface AvatarProps {
    name: string;
    isBot?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function Avatar({ name, isBot, size = 'md', className = '' }: AvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20'
    };

    // Logic to determine "VIP" status (e.g., specific names or high rank)
    const isVIP = name.toLowerCase().includes('king') || name.toLowerCase().includes('boss');

    const tierClass = isBot ? 'avatar-bot' : (isVIP ? 'avatar-vip' : 'avatar-human');

    return (
        <div className={`avatar-base ${sizeClasses[size]} ${tierClass} ${className}`}>
            {/* Subtle Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-50"></div>
        </div>
    );
}