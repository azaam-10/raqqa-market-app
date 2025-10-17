
import React, { useState } from 'react';

const StarIcon = ({ fill, className }: { fill: string, className?: string }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={fill} stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

interface StarInputProps {
    currentRating: number;
    onRatingSubmit: (rating: number) => void;
    disabled?: boolean;
}

const StarInput: React.FC<StarInputProps> = ({ currentRating, onRatingSubmit, disabled = false }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const handleClick = (rating: number) => {
        if (!disabled) {
            onRatingSubmit(rating);
        }
    };

    return (
        <div className="flex items-center" dir="ltr">
            {[1, 2, 3, 4, 5].map((rating) => (
                <button
                    key={rating}
                    type="button"
                    disabled={disabled}
                    className="focus:outline-none disabled:cursor-not-allowed"
                    onClick={() => handleClick(rating)}
                    onMouseEnter={() => setHoverRating(rating)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${rating} stars`}
                >
                    <StarIcon
                        fill={rating <= (hoverRating || currentRating) ? '#f59e0b' : 'none'}
                        className="text-amber-400 transition-transform duration-150 ease-in-out transform hover:scale-125"
                    />
                </button>
            ))}
        </div>
    );
};

export default StarInput;
