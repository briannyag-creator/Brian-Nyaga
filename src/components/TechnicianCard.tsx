import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import {
  ReviewRecord,
  TechnicianRecord,
  computeTechnicianRating,
} from '../lib/kenyaData';
import { formatKes } from '../lib/validation';
import { StarRatingDisplay } from './StarRating';

interface TechnicianCardProps {
  technician: TechnicianRecord;
  reviews: ReviewRecord[];
  distanceKm?: number | null;
  onSelect: (tech: TechnicianRecord) => void;
  onBook: (tech: TechnicianRecord) => void;
}

export function TechnicianCard({
  technician,
  reviews,
  distanceKm,
  onSelect,
  onBook,
}: TechnicianCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const ratingSummary = computeTechnicianRating(technician, reviews);

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5">
      {/* 4:3 Image slot with resilient CSS fallback */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {!imgFailed && technician.photoUrl ? (
          <img
            src={technician.photoUrl}
            alt={`${technician.fullName} — ${technician.trade} technician in ${technician.county}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 p-6 text-center">
            <Wrench className="w-8 h-8 mb-2 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-600">{technician.trade}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Unboxed metadata line — zero pills */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
          <span className="font-medium text-slate-700">{technician.trade}</span>
          <span aria-hidden="true">·</span>
          <span>{technician.county} County</span>
          {typeof distanceKm === 'number' ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-medium text-emerald-800 tabular-nums">
                {distanceKm.toFixed(1)} km away
              </span>
            </>
          ) : (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{technician.serviceRadiusKm} km radius</span>
            </>
          )}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-1">
          {technician.fullName}
        </h3>

        <p className="text-xs text-slate-500 mb-2.5">
          {technician.town} · {technician.certification}
        </p>

        {/* Live Rating & Review Row */}
        <button
          type="button"
          onClick={() => onSelect(technician)}
          className="flex items-center justify-between gap-2 mb-3 py-1.5 px-2.5 -mx-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            {ratingSummary.average !== null ? (
              <>
                <StarRatingDisplay rating={ratingSummary.average} size="xs" />
                <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                  {ratingSummary.average.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500">New fundi</span>
            )}
            <span className="text-xs text-slate-500 tabular-nums">
              {ratingSummary.reviewCount > 0
                ? `(${ratingSummary.reviewCount} ${ratingSummary.reviewCount === 1 ? 'review' : 'reviews'})`
                : '(No reviews yet)'}
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 whitespace-nowrap">
            {ratingSummary.totalJobs} jobs
          </span>
        </button>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-3 flex-1">
          {technician.bio}
        </p>

        {ratingSummary.latestReview && (
          <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600">
            <p className="line-clamp-2 italic text-slate-700">
              “{ratingSummary.latestReview.comment}”
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              — {ratingSummary.latestReview.authorName} ·{' '}
              <span className="font-mono">{ratingSummary.latestReview.rating}.0★</span>
            </p>
          </div>
        )}

        <div className="text-xs text-slate-600 mb-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span
            className={
              technician.availableNow
                ? 'text-emerald-800 font-medium'
                : 'text-amber-700 font-medium'
            }
          >
            {technician.availableNow ? 'Available today' : 'Scheduled slots'}
          </span>
          <span>
            {technician.remoteSupport ? 'Onsite + Video triage' : 'Onsite dispatch'}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-4">
          <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
            {formatKes(technician.calloutFeeKes)}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">callout</span>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {formatKes(technician.hourlyRateKes)}/hr
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSelect(technician)}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={() => onBook(technician)}
            className="px-3.5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Book Fundi
          </button>
        </div>
      </div>
    </article>
  );
}
