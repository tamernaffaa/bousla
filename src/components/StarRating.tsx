/**
 * StarRating Component
 * 
 * Reusable 5-star rating component for rating customers/captains
 */

'use client';

import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

interface StarRatingProps {
    rating: number;
    onRatingChange: (rating: number) => void;
    size?: number;
    readonly?: boolean;
}

export default function StarRating({ rating, onRatingChange, size = 32, readonly = false }: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => !readonly && onRatingChange(star)}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                >
                    <FaStar
                        size={size}
                        className={`transition-colors ${star <= (hoverRating || rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}
