/**
 * SwipeButton Component
 * 
 * A swipe-to-confirm button to prevent accidental taps
 */

'use client';

import React, { useState, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface SwipeButtonProps {
    onSwipeComplete: () => void;
    text: string;
    icon?: string;
    color?: string;
    disabled?: boolean;
}

export default function SwipeButton({
    onSwipeComplete,
    text,
    icon = '→',
    color = 'bg-blue-500',
    disabled = false
}: SwipeButtonProps) {
    const [swiped, setSwiped] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const threshold = containerWidth * 0.7; // 70% swipe required

        if (info.offset.x > threshold && !disabled) {
            setSwiped(true);
            setTimeout(() => {
                onSwipeComplete();
                setSwiped(false);
            }, 300);
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-14 rounded-xl overflow-hidden ${disabled ? 'opacity-50' : ''}`}
        >
            {/* Background Track */}
            <div className={`absolute inset-0 ${color} opacity-20`}></div>

            {/* Text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700">
                    {swiped ? '✓ تم!' : text}
                </span>
            </div>

            {/* Swipe Handle */}
            {!swiped && (
                <motion.div
                    drag={disabled ? false : 'x'}
                    dragConstraints={{ left: 0, right: containerRef.current?.offsetWidth ? containerRef.current.offsetWidth - 56 : 0 }}
                    dragElastic={0.1}
                    onDragEnd={handleDragEnd}
                    className={`absolute left-0 top-0 bottom-0 w-14 ${color} rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg`}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-white text-2xl">{icon}</span>
                </motion.div>
            )}
        </div>
    );
}
