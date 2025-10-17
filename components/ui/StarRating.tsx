
import React from 'react';

const StarIcon: React.FC<{ fill: string }> = ({ fill }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={fill} stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

interface StarRatingProps {
    rating: number;
    count?: number;
    size?: 'sm' | 'md';
}

const StarRating: React.FC<StarRatingProps> = ({ rating, count, size = 'md' }) => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5

    for (let i = 1; i <= 5; i++) {
        let fill = "none";
        if (roundedRating >= i) {
            fill = "#f59e0b"; // filled
        }
        // Note: Half-star rendering can be complex with pure SVG fill. This implementation uses full or empty stars for clarity.
        stars.push(<StarIcon key={i} fill={fill} />);
    }

    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

    return (
        <div className="flex items-center gap-1" title={`${rating.toFixed(1)} من 5 نجوم`}>
            <div className="flex">{stars}</div>
            {count !== undefined && <span className={`${textSize} text-slate-400`}>({count})</span>}
        </div>
    );
};

export default StarRating;