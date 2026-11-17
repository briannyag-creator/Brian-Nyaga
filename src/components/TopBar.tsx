import React from 'react';
import { LogOut } from 'lucide-react';
import { useFundi } from '../context/FirebaseContext';

export type ActiveView = 'directory' | 'bookings' | 'fundi-portal';

interface TopBarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView, sectionId?: string) => void;
  onOpenAuth: () => void;
  bookingCount: number;
}

export function TopBar({
  activeView,
  onNavigate,
  onOpenAuth,
  bookingCount,
}: TopBarProps) {
  const { user, signOut } = useFundi();

  const displayLabel =
    user?.displayName || user?.phoneNumber || user?.email || 'Account';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-700 rounded"
        >
          FundiLink
        </button>

        {/* Zone 2: 4 single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate('directory', 'directory-section')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeView === 'directory'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Directory
          </button>
          <button
            type="button"
            onClick={() => onNavigate('directory', 'counties-section')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 transition-colors"
          >
            Counties
          </button>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeView === 'bookings'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            {bookingCount > 0 ? `My Bookings (${bookingCount})` : 'My Bookings'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('fundi-portal')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeView === 'fundi-portal'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Register as Fundi
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span className="max-w-[140px] truncate">{displayLabel}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => onNavigate('directory', 'directory-section')}
          className={`whitespace-nowrap shrink-0 py-1 ${
            activeView === 'directory' ? 'text-emerald-700 font-semibold' : ''
          }`}
        >
          Directory
        </button>
        <button
          type="button"
          onClick={() => onNavigate('directory', 'counties-section')}
          className="whitespace-nowrap shrink-0 py-1"
        >
          Counties
        </button>
        <button
          type="button"
          onClick={() => onNavigate('bookings')}
          className={`whitespace-nowrap shrink-0 py-1 ${
            activeView === 'bookings' ? 'text-emerald-700 font-semibold' : ''
          }`}
        >
          {bookingCount > 0 ? `Bookings (${bookingCount})` : 'My Bookings'}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('fundi-portal')}
          className={`whitespace-nowrap shrink-0 py-1 ${
            activeView === 'fundi-portal' ? 'text-emerald-700 font-semibold' : ''
          }`}
        >
          Join as Fundi
        </button>
      </div>
    </header>
  );
}
