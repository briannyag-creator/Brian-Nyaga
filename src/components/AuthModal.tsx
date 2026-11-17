import React, { useEffect, useRef, useState } from 'react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { X, Eye, EyeOff, Mail, Phone } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useFundi } from '../context/FirebaseContext';
import { isValidKenyanPhone } from '../lib/validation';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

type AuthTab = 'login' | 'signup' | 'reset';
type AuthMethod = 'email' | 'phone';

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err);
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Incorrect email or password. Please check your credentials or reset your password.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found with that email address.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Switch to Log In instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Choose a stronger password (at least 6 characters).';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Enter a valid Kenyan mobile number (e.g., 0712345678 or +254712345678).';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'The 6-digit SMS verification code is incorrect. Try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a few minutes before trying again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in provider is not yet enabled in Firebase Console -> Authentication -> Sign-in method. Enable Email/Password and Phone providers there, or sign in with Google below.';
  }
  return msg;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const {
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    sendPhoneOtp,
    verifyPhoneOtp,
    signingIn,
  } = useFundi();

  const [tab, setTab] = useState<AuthTab>('login');
  const [method, setMethod] = useState<AuthMethod>('email');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(
    null
  );

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!open) {
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch {
          // ignore cleanup failure
        }
        verifierRef.current = null;
      }
      setConfirmationResult(null);
      setOtpCode('');
      setErrorMsg(null);
      setInfoMsg(null);
    }
  }, [open]);

  if (!open) return null;

  const ensureRecaptcha = () => {
    if (!recaptchaRef.current) {
      throw new Error('Verification widget failed to initialize.');
    }
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
      });
    }
    return verifierRef.current;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (tab === 'reset') {
      if (!email.trim()) {
        setErrorMsg('Enter the email address for your account.');
        return;
      }
      setBusy(true);
      try {
        await resetPassword(email);
        setInfoMsg(
          'Password reset email sent. Check your inbox (and spam folder) for the reset link.'
        );
      } catch (err) {
        setErrorMsg(friendlyAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (tab === 'signup' && fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (tab === 'signup') {
        await signUpWithEmail(fullName, email, password);
        setInfoMsg(
          'Account created! We sent a verification link to your email. Please verify your email to unlock dispatch bookings.'
        );
        onAuthenticated?.();
      } else {
        await signInWithEmail(email, password);
        onAuthenticated?.();
        onClose();
      }
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!isValidKenyanPhone(phone)) {
      setErrorMsg('Enter a valid Kenyan mobile number (e.g., 0712345678 or +254712345678).');
      return;
    }
    if (tab === 'signup' && fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name before requesting the SMS code.');
      return;
    }

    setBusy(true);
    try {
      const verifier = ensureRecaptcha();
      const result = await sendPhoneOtp(phone, verifier);
      setConfirmationResult(result);
      setInfoMsg('6-digit SMS verification code sent to your Kenyan mobile number.');
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch {
          // ignore
        }
        verifierRef.current = null;
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      await verifyPhoneOtp(confirmationResult, otpCode, fullName);
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    const user = await signInWithGoogle();
    if (user) {
      onAuthenticated?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">FundiLink Account</p>
            <h2 id="auth-modal-title" className="text-lg font-bold text-slate-900">
              {tab === 'login'
                ? 'Log in to your account'
                : tab === 'signup'
                  ? 'Create your account'
                  : 'Reset your password'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Primary Tabs: Log In / Sign Up / Reset */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('reset');
                setMethod('email');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === 'reset'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reset
            </button>
          </div>

          {/* Method Switch: Email vs Phone */}
          {tab !== 'reset' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  method === 'email'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setErrorMsg(null);
                }}
                className={`inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  method === 'phone'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Phone (+254)</span>
              </button>
            </div>
          )}

          {/* Email / Password / Reset Form */}
          {(method === 'email' || tab === 'reset') && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Mercy Njeri"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.co.ke"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {tab !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTab('reset');
                          setErrorMsg(null);
                          setInfoMsg(null);
                        }}
                        className="text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || signingIn}
                className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
              >
                {busy
                  ? 'Please wait...'
                  : tab === 'login'
                    ? 'Log In with Email'
                    : tab === 'signup'
                      ? 'Create Account'
                      : 'Send Password Reset Link'}
              </button>
            </form>
          )}

          {/* Phone (+254) OTP Form */}
          {method === 'phone' && tab !== 'reset' && (
            <div className="space-y-4">
              {!confirmationResult ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {tab === 'signup' && (
                    <div>
                      <label htmlFor="auth-phone-name" className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        id="auth-phone-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Peter Mutua"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Kenyan Phone Number
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712345678 or +254712345678"
                      className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || signingIn}
                    className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    {busy ? 'Sending SMS...' : 'Send SMS Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="auth-otp" className="block text-xs font-semibold text-slate-700 mb-1">
                      6-Digit SMS Code
                    </label>
                    <input
                      id="auth-otp"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Change Number
                    </button>
                    <button
                      type="submit"
                      disabled={busy || signingIn}
                      className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg"
                    >
                      {busy ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Invisible reCAPTCHA anchor */}
          <div ref={recaptchaRef} id="recaptcha-container" />

          {errorMsg && (
            <div
              role="alert"
              className="p-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div
              role="status"
              className="p-3 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg leading-relaxed"
            >
              {infoMsg}
            </div>
          )}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-500">or continue quickly</span>
            </div>
          </div>

          <button
            type="button"
            disabled={signingIn || busy}
            onClick={() => {
              void handleGoogle();
            }}
            className="w-full py-2.5 px-4 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {signingIn ? 'Connecting to Google...' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
