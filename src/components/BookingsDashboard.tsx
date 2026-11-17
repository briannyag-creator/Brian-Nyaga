import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin, MessageSquare, Pencil, Phone, Trash2 } from 'lucide-react';
import { FundiSmsSettings, useFundi } from '../context/FirebaseContext';
import { BookingRecord } from '../lib/kenyaData';
import { VALIDATION_LIMITS, formatKes } from '../lib/validation';
import { ServiceRequestMap } from './ServiceRequestMap';
import { StarRatingDisplay, StarRatingInput } from './StarRating';

const STATUS_LABELS: Record<BookingRecord['status'], string> = {
  requested: 'Requested',
  accepted: 'Accepted by Fundi',
  en_route: 'En Route',
  in_progress: 'Work in Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const NEXT_TECH_STEP: Partial<
  Record<BookingRecord['status'], { next: BookingRecord['status']; label: string }>
> = {
  requested: { next: 'accepted', label: 'Accept Dispatch' },
  accepted: { next: 'en_route', label: 'Mark En Route' },
  en_route: { next: 'in_progress', label: 'Start Work' },
  in_progress: { next: 'completed', label: 'Mark Completed' },
};

interface BookingsDashboardProps {
  onBrowseDirectory: () => void;
  onOpenAuth: () => void;
}

export function BookingsDashboard({
  onBrowseDirectory,
  onOpenAuth,
}: BookingsDashboardProps) {
  const {
    user,
    isAccountVerified,
    resendVerificationEmail,
    refreshAuthUser,
    customerBookings,
    incomingJobs,
    bookingsLoading,
    updateBookingStatus,
    saveBookingMpesaRef,
    reviews,
    submitReview,
    updateReview,
    deleteReview,
    fetchFundiSmsSettings,
  } = useFundi();

  const [viewMode, setViewMode] = useState<'customer' | 'incoming'>('customer');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [mpesaInputs, setMpesaInputs] = useState<Record<string, string>>({});
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [smsSettings, setSmsSettings] = useState<FundiSmsSettings | null>(null);

  useEffect(() => {
    if (!user || !isAccountVerified || viewMode !== 'incoming') return;
    let active = true;
    fetchFundiSmsSettings()
      .then((data) => {
        if (active) setSmsSettings(data);
      })
      .catch(() => {
        // ignore if unavailable
      });
    return () => {
      active = false;
    };
  }, [user, isAccountVerified, viewMode, incomingJobs.length]);

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Track your technician dispatches
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Sign in with your email, phone number, or Google account to view live service request locations, M-Pesa confirmation codes, and job progress.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            Log In or Sign Up
          </button>
        </div>
      </section>
    );
  }

  if (!isAccountVerified) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-amber-200 rounded-xl p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            Verify your email address to access bookings
          </h1>
          <p className="text-sm text-slate-600">
            We sent a verification link to <span className="font-semibold">{user.email}</span>. Open that link in your email, then click the refresh button below.
          </p>
          {verifyMsg && <p className="text-xs font-medium text-emerald-800">{verifyMsg}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                const ok = await refreshAuthUser();
                if (!ok) {
                  setVerifyMsg('Email is still unverified. Click the link in your inbox first.');
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              I Have Verified — Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setVerifyMsg('Verification email resent.');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Resend Verification Email
            </button>
          </div>
        </div>
      </section>
    );
  }

  const reviewByBookingId = new window.Map(reviews.map((r) => [r.bookingId, r]));
  const activeList = viewMode === 'customer' ? customerBookings : incomingJobs;

  const handleSaveMpesa = async (bookingId: string) => {
    setActionError(null);
    const code = mpesaInputs[bookingId] || '';
    setBusyId(bookingId);
    try {
      await saveBookingMpesaRef(bookingId, code);
      setMpesaInputs((prev) => ({ ...prev, [bookingId]: '' }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save M-Pesa code.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (
    bookingId: string,
    nextStatus: BookingRecord['status']
  ) => {
    setActionError(null);
    setBusyId(bookingId);
    try {
      await updateBookingStatus(bookingId, nextStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update job status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewSubmit = async (booking: BookingRecord) => {
    setActionError(null);
    if (reviewComment.trim().length < VALIDATION_LIMITS.commentMin) {
      setActionError(
        `Please write at least ${VALIDATION_LIMITS.commentMin} characters describing the work.`
      );
      return;
    }
    setBusyId(booking.id);
    try {
      if (editingReviewId) {
        await updateReview({
          reviewId: editingReviewId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
      } else {
        await submitReview({
          technicianId: booking.technicianId,
          bookingId: booking.id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });
      }
      setReviewBookingId(null);
      setEditingReviewId(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not post review.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteReview = async (bookingId: string, reviewId: string) => {
    setActionError(null);
    setBusyId(bookingId);
    try {
      await deleteReview(reviewId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete review.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings & Dispatch Ledger</h1>
          <p className="text-sm text-slate-600 mt-1">
            Live job updates, pinned service request locations, M-Pesa reference tracking, and verified reviews.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => {
              setViewMode('customer');
              setSelectedBookingId(null);
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'customer'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Requests ({customerBookings.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('incoming');
              setSelectedBookingId(null);
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'incoming'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Incoming Fundi Jobs ({incomingJobs.length})
          </button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
        >
          {actionError}
        </div>
      )}

      {/* Incoming Fundi Prompt Banner & SMS Alert Feed */}
      {viewMode === 'incoming' && (
        <div className="space-y-3">
          {incomingJobs
            .filter((job) => job.status === 'requested')
            .map((job) => {
              const smsPreview = `[FundiLink ${job.urgency === 'emergency' ? 'URGENT' : 'SCHEDULED'}] New ${job.trade} job in ${job.town}, ${job.county}. Client: ${job.customerName} (${job.customerPhone}). Site: ${job.estateLandmark}. Callout: ${formatKes(job.estimatedCalloutKes)}.`;
              return (
                <div
                  key={`prompt_${job.id}`}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                      <MessageSquare className="w-4 h-4 text-amber-800" aria-hidden="true" />
                      <span>New Booking Prompt Waiting for Response</span>
                    </div>
                    <p className="text-xs font-mono text-amber-900">{smsPreview}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={`tel:${job.customerPhone}`}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Call Client</span>
                    </a>
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() => void handleStatusChange(job.id, 'accepted')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                    >
                      Accept Dispatch
                    </button>
                  </div>
                </div>
              );
            })}

          {smsSettings && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                {smsSettings.enabled && smsSettings.phoneE164
                  ? `Instant SMS booking alerts active on ${smsSettings.phoneE164}${smsSettings.gatewayProvider ? ` via ${smsSettings.gatewayProvider}` : ' (configure Africa’s Talking or Twilio in Secrets for carrier delivery)'}.`
                  : 'Add your mobile number under Register as Fundi to receive instant SMS text messages when customers book you.'}
              </span>
              {smsSettings.recentAlerts.length > 0 && (
                <span className="font-mono text-slate-500 tabular-nums">
                  {smsSettings.recentAlerts.length} recent SMS{' '}
                  {smsSettings.recentAlerts.length === 1 ? 'prompt' : 'prompts'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Map of Service Request Locations */}
      {!bookingsLoading && activeList.length > 0 && (
        <ServiceRequestMap
          bookings={activeList}
          selectedBookingId={selectedBookingId || activeList[0]?.id || null}
          onSelectBooking={setSelectedBookingId}
        />
      )}

      {bookingsLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            {viewMode === 'customer'
              ? 'No technician dispatches yet'
              : 'No incoming jobs assigned to your Fundi profile'}
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            {viewMode === 'customer'
              ? 'Browse vetted technicians across all 47 Kenyan counties to book onsite repair or remote video triage.'
              : 'When customers book your Fundi profile, their service request locations and dispatch details appear here in real time.'}
          </p>
          <button
            type="button"
            onClick={onBrowseDirectory}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            Browse Technicians
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeList.map((booking) => {
            const isTerminal =
              booking.status === 'completed' || booking.status === 'cancelled';
            const nextStep = NEXT_TECH_STEP[booking.status];
            const existingReview = reviewByBookingId.get(booking.id);
            const isFocused = selectedBookingId === booking.id;
            const isReviewFormOpen = reviewBookingId === booking.id;

            return (
              <article
                key={booking.id}
                className={`bg-white border rounded-xl p-5 sm:p-6 space-y-4 transition-colors ${
                  isFocused ? 'border-emerald-700' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-mono">{booking.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{booking.trade}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {booking.serviceMode === 'remote_triage'
                          ? 'Remote Video Triage'
                          : 'Onsite Dispatch'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {viewMode === 'customer'
                        ? booking.technicianName
                        : `${booking.customerName} (${booking.customerPhone})`}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {booking.town}, {booking.county} County · {booking.estateLandmark}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedBookingId(booking.id)}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          Focus on Map ({booking.lat.toFixed(4)}, {booking.lng.toFixed(4)})
                        </span>
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${booking.lat},${booking.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <span
                      className={`text-xs font-semibold ${
                        booking.status === 'completed'
                          ? 'text-emerald-800'
                          : booking.status === 'cancelled'
                            ? 'text-red-700'
                            : 'text-amber-800'
                      }`}
                    >
                      Status: {STATUS_LABELS[booking.status]}
                    </span>
                    <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                      {formatKes(booking.estimatedCalloutKes)} callout
                    </span>
                    <span className="text-xs text-slate-500">{booking.scheduledDate}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3.5">
                  {booking.issueDescription}
                </p>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    {booking.mpesaRef ? (
                      <span>
                        M-Pesa Confirmation:{' '}
                        <span className="font-mono font-semibold text-slate-900">
                          {booking.mpesaRef}
                        </span>
                      </span>
                    ) : viewMode === 'customer' && !isTerminal ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          maxLength={30}
                          value={mpesaInputs[booking.id] || ''}
                          onChange={(e) =>
                            setMpesaInputs((prev) => ({
                              ...prev,
                              [booking.id]: e.target.value,
                            }))
                          }
                          placeholder="M-Pesa code (e.g. UAH8K92P1X)"
                          className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                        />
                        <button
                          type="button"
                          disabled={busyId === booking.id}
                          onClick={() => void handleSaveMpesa(booking.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Save M-Pesa Ref
                        </button>
                      </div>
                    ) : (
                      <span>No M-Pesa reference recorded yet.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {viewMode === 'customer' &&
                      (booking.status === 'requested' || booking.status === 'accepted') && (
                        <button
                          type="button"
                          disabled={busyId === booking.id}
                          onClick={() => void handleStatusChange(booking.id, 'cancelled')}
                          className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Cancel Dispatch
                        </button>
                      )}

                    {viewMode === 'incoming' && nextStep && (
                      <button
                        type="button"
                        disabled={busyId === booking.id}
                        onClick={() => void handleStatusChange(booking.id, nextStep.next)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                      >
                        {nextStep.label}
                      </button>
                    )}

                    {viewMode === 'customer' &&
                      booking.status === 'completed' &&
                      !existingReview &&
                      !isReviewFormOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewBookingId(booking.id);
                            setEditingReviewId(null);
                            setReviewRating(5);
                            setReviewComment('');
                            setActionError(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                        >
                          Rate & Review Fundi
                        </button>
                      )}
                  </div>
                </div>

                {/* Display Submitted Review Inline */}
                {existingReview && !isReviewFormOpen && (
                  <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {viewMode === 'customer' ? 'Your Verified Review' : 'Customer Review'}
                        </span>
                        <StarRatingDisplay rating={existingReview.rating} size="xs" />
                        <span className="text-xs font-mono text-slate-600 tabular-nums">
                          {existingReview.rating}.0 / 5.0
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{existingReview.comment}</p>
                    </div>

                    {viewMode === 'customer' && user.uid === existingReview.authorUid && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewBookingId(booking.id);
                            setEditingReviewId(existingReview.id);
                            setReviewRating(existingReview.rating);
                            setReviewComment(existingReview.comment);
                            setActionError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === booking.id}
                          onClick={() => void handleDeleteReview(booking.id, existingReview.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isReviewFormOpen && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {editingReviewId
                          ? `Edit your review for ${booking.technicianName}`
                          : `Rate ${booking.technicianName}`}
                      </span>
                      <StarRatingInput
                        value={reviewRating}
                        onChange={setReviewRating}
                        disabled={busyId === booking.id}
                      />
                    </div>
                    <div>
                      <textarea
                        rows={3}
                        maxLength={VALIDATION_LIMITS.commentMax}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share punctuality, diagnostic accuracy, and pricing transparency..."
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                      <div className="text-[11px] font-mono text-slate-500 text-right mt-1">
                        {reviewComment.length}/{VALIDATION_LIMITS.commentMax}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewBookingId(null);
                          setEditingReviewId(null);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === booking.id}
                        onClick={() => void handleReviewSubmit(booking)}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                      >
                        {editingReviewId ? 'Save Changes' : 'Publish Review'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
