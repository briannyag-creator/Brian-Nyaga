import React, { useState } from 'react';
import { Star } from 'lucide-react';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function StarRatingDisplay({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const iconClass =
    size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const rounded = Math.round(rating);

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rated ${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconClass} ${
            star <= rounded
              ? 'fill-amber-400 text-amber-500'
              : 'fill-slate-100 text-slate-300'
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Rate technician from 1 to 5 stars"
        className="inline-flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= active;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} ${star === 1 ? 'star' : 'stars'} — ${RATING_LABELS[star]}`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(star)}
              className="p-1 rounded hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-500'
                    : 'fill-slate-100 text-slate-300'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <span className="text-xs font-medium text-slate-600 font-mono tabular-nums">
        {active}/5 · {RATING_LABELS[active]}
      </span>
    </div>
  );
}
