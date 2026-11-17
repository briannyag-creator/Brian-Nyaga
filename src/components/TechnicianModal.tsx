import React, { useState } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Video,
  Languages,
  Wrench,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useFundi } from '../context/FirebaseContext';
import {
  ReviewRecord,
  TechnicianRecord,
  computeTechnicianRating,
  getReviewTimestampMs,
  sortReviewsNewest,
} from '../lib/kenyaData';
import { VALIDATION_LIMITS, formatKes } from '../lib/validation';
import { StarRatingDisplay, StarRatingInput } from './StarRating';

interface TechnicianModalProps {
  technician: TechnicianRecord | null;
  reviews: ReviewRecord[];
  onClose: () => void;
  onBook: (tech: TechnicianRecord) => void;
}

function formatReviewDate(createdAt: unknown): string {
  const ms = getReviewTimestampMs(createdAt);
  if (!ms) return 'Verified customer';
  return new Date(ms).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TechnicianModal({
  technician,
  reviews,
  onClose,
  onBook,
}: TechnicianModalProps) {
  const {
    user,
    isAccountVerified,
    customerBookings,
    submitReview,
    updateReview,
    deleteReview,
  } = useFundi();

  const [imgFailed, setImgFailed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!technician) return null;

  const techReviews = sortReviewsNewest(
    reviews.filter((r) => r.technicianId === technician.id)
  );
  const ratingSummary = computeTechnicianRating(technician, reviews);

  const reviewedBookingIds = new Set(reviews.map((r) => r.bookingId));
  const eligibleCompletedBooking =
    user && isAccountVerified
      ? customerBookings.find(
          (b) =>
            b.technicianId === technician.id &&
            b.status === 'completed' &&
            !reviewedBookingIds.has(b.id)
        ) || null
      : null;

  const handleSubmitNewReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibleCompletedBooking) return;
    setReviewError(null);
    if (comment.trim().length < VALIDATION_LIMITS.commentMin) {
      setReviewError(
        `Please write at least ${VALIDATION_LIMITS.commentMin} characters describing the job.`
      );
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        technicianId: technician.id,
        bookingId: eligibleCompletedBooking.id,
        rating,
        comment: comment.trim(),
      });
      setComment('');
      setRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to publish review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (reviewId: string) => {
    setReviewError(null);
    if (editComment.trim().length < VALIDATION_LIMITS.commentMin) {
      setReviewError(
        `Please write at least ${VALIDATION_LIMITS.commentMin} characters.`
      );
      return;
    }
    setSubmitting(true);
    try {
      await updateReview({
        reviewId,
        rating: editRating,
        comment: editComment.trim(),
      });
      setEditingReviewId(null);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to update review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setReviewError(null);
    setSubmitting(true);
    try {
      await deleteReview(reviewId);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to delete review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 z-10">
          <div>
            <p className="text-xs text-slate-500">
              {technician.trade} · {technician.county} County
            </p>
            <h2 id="tech-modal-title" className="text-lg font-bold text-slate-900">
              {technician.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-5 gap-6 items-stretch">
            <div className="sm:col-span-2 aspect-[4/3] sm:aspect-auto rounded-lg overflow-hidden bg-slate-100">
              {!imgFailed && technician.photoUrl ? (
                <img
                  src={technician.photoUrl}
                  alt={technician.fullName}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-slate-100 text-slate-500">
                  <Wrench className="w-7 h-7 mb-2 text-slate-400" />
                  <span className="text-xs">{technician.trade}</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-3 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">{technician.bio}</p>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-medium text-slate-900">{technician.town}</div>
                    <div>{technician.serviceRadiusKm} km dispatch radius</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-medium text-slate-900">{technician.certification}</div>
                    <div>{technician.experienceYears} years experience</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Video className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-medium text-slate-900">
                      {technician.remoteSupport ? 'Remote Triage Active' : 'Onsite Service'}
                    </div>
                    <div>
                      {technician.remoteSupport
                        ? 'Nationwide video guidance'
                        : 'Physical inspection only'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Languages className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="font-medium text-slate-900">Languages</div>
                    <div>{technician.languages.join(', ')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Rate Breakdown */}
          <div className="border-t border-b border-slate-200 py-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Standard Callout</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatKes(technician.calloutFeeKes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Labour Rate</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatKes(technician.hourlyRateKes)}/hr
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Track Record</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums">
                {ratingSummary.average !== null
                  ? `${ratingSummary.average.toFixed(1)} / 5.0`
                  : 'New'}{' '}
                · {ratingSummary.totalJobs} jobs
              </div>
            </div>
          </div>

          {/* Ratings Summary & Distribution */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Ratings & Verified Reviews
                </h3>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {ratingSummary.average !== null
                      ? ratingSummary.average.toFixed(1)
                      : '—'}
                  </span>
                  <div>
                    <StarRatingDisplay
                      rating={ratingSummary.average ?? 0}
                      size="md"
                    />
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ratingSummary.reviewCount}{' '}
                      {ratingSummary.reviewCount === 1
                        ? 'verified review'
                        : 'verified reviews'}
                    </p>
                  </div>
                </div>
              </div>

              {ratingSummary.reviewCount > 0 && (
                <div className="w-full sm:w-56 space-y-1">
                  {ratingSummary.distribution.map((row) => {
                    const pct =
                      ratingSummary.reviewCount > 0
                        ? Math.round((row.count / ratingSummary.reviewCount) * 100)
                        : 0;
                    return (
                      <div
                        key={row.stars}
                        className="flex items-center gap-2 text-[11px] font-mono text-slate-600"
                      >
                        <span className="w-6 shrink-0">{row.stars}★</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{row.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {reviewError && (
              <div
                role="alert"
                className="p-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {reviewError}
              </div>
            )}

            {/* Direct Review Submission if user has a completed unreviewed booking */}
            {eligibleCompletedBooking && (
              <form
                onSubmit={(e) => void handleSubmitNewReview(e)}
                className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Rate your completed job ({eligibleCompletedBooking.scheduledDate})
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Share feedback on punctuality, workmanship, and KES pricing transparency.
                  </p>
                </div>

                <StarRatingInput
                  value={rating}
                  onChange={setRating}
                  disabled={submitting}
                />

                <div>
                  <textarea
                    rows={3}
                    maxLength={VALIDATION_LIMITS.commentMax}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={`How was your experience with ${technician.fullName}?`}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                  <div className="text-[11px] text-slate-500 text-right font-mono mt-1">
                    {comment.length}/{VALIDATION_LIMITS.commentMax}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    {submitting ? 'Publishing...' : 'Publish Verified Review'}
                  </button>
                </div>
              </form>
            )}

            {/* Verified Customer Reviews List */}
            {techReviews.length === 0 ? (
              <p className="text-sm text-slate-500">
                No written reviews posted on-platform yet. Complete a booking with{' '}
                {technician.fullName} to leave the first verified review.
              </p>
            ) : (
              <div className="space-y-3">
                {techReviews.map((rev) => {
                  const isMine = Boolean(user && user.uid === rev.authorUid);
                  const isEditing = editingReviewId === rev.id;

                  return (
                    <div
                      key={rev.id}
                      className="pb-3.5 border-b border-slate-100 last:border-0 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {rev.authorName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              · {formatReviewDate(rev.createdAt)}
                            </span>
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <StarRatingDisplay rating={rev.rating} size="xs" />
                              <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                                {rev.rating}.0
                              </span>
                            </div>
                          )}
                        </div>

                        {isMine && !isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReviewId(rev.id);
                                setEditRating(rev.rating);
                                setEditComment(rev.comment);
                                setReviewError(null);
                              }}
                              aria-label="Edit your review"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void handleDelete(rev.id)}
                              aria-label="Delete your review"
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <StarRatingInput
                            value={editRating}
                            onChange={setEditRating}
                            disabled={submitting}
                          />
                          <textarea
                            rows={2}
                            maxLength={VALIDATION_LIMITS.commentMax}
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void handleSaveEdit(rev.id)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700">{rev.comment}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBook(technician);
              }}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
            >
              Book {technician.fullName.split(' ')[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
