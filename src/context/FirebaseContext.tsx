import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BUILT_IN_TECHNICIANS,
  BookingRecord,
  ReviewRecord,
  TechnicianRecord,
  UserPrivateProfile,
  getCountyCoordinates,
} from '../lib/kenyaData';
import {
  VALIDATION_LIMITS,
  isValidKenyanPhone,
  normalizeKenyanPhone,
  toE164KenyanPhone,
} from '../lib/validation';

export interface SmsAlertLog {
  id: string;
  bookingId: string;
  createdAt: string;
  messageText: string;
  sent: boolean;
  provider: string | null;
  reason?: string;
}

export interface FundiSmsSettings {
  phoneE164: string;
  enabled: boolean;
  gatewayConfigured: boolean;
  gatewayProvider: string | null;
  recentAlerts: SmsAlertLog[];
}

export interface BookingSmsNotice {
  sent: boolean;
  configured: boolean;
  provider: string | null;
  previewText: string;
  reason?: string;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  isAccountVerified: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  sendPhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifier
  ) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (
    confirmation: ConfirmationResult,
    otpCode: string,
    fullName?: string
  ) => Promise<User>;
  signOut: () => Promise<void>;
  privateProfile: UserPrivateProfile | null;
  savePrivateProfile: (data: Omit<UserPrivateProfile, 'uid'>) => Promise<void>;
  technicians: TechnicianRecord[];
  techniciansLoading: boolean;
  myTechnicianProfile: TechnicianRecord | null;
  upsertTechnicianProfile: (
    data: Omit<TechnicianRecord, 'id' | 'ownerUid' | 'ratingAvg' | 'jobsCompleted'>
  ) => Promise<string>;
  customerBookings: BookingRecord[];
  incomingJobs: BookingRecord[];
  bookingsLoading: boolean;
  lastBookingSmsNotice: BookingSmsNotice | null;
  createBooking: (
    payload: Omit<
      BookingRecord,
      'id' | 'customerId' | 'mpesaRef' | 'status' | 'createdAt' | 'updatedAt'
    >
  ) => Promise<string>;
  updateBookingStatus: (
    bookingId: string,
    nextStatus: BookingRecord['status']
  ) => Promise<void>;
  saveBookingMpesaRef: (bookingId: string, mpesaRef: string) => Promise<void>;
  reviews: ReviewRecord[];
  submitReview: (payload: {
    technicianId: string;
    bookingId: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  updateReview: (payload: {
    reviewId: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  fetchFundiSmsSettings: () => Promise<FundiSmsSettings>;
  saveFundiSmsSettings: (payload: {
    phone: string;
    enabled: boolean;
    technicianId?: string;
  }) => Promise<{ ok: boolean; phoneE164: string; enabled: boolean; gatewayConfigured: boolean }>;
  sendTestFundiSms: (payload: {
    phone: string;
    fullName?: string;
  }) => Promise<BookingSmsNotice & { phoneE164: string }>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [privateProfile, setPrivateProfile] = useState<UserPrivateProfile | null>(null);
  const [firestoreTechnicians, setFirestoreTechnicians] = useState<TechnicianRecord[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(true);
  const [customerBookings, setCustomerBookings] = useState<BookingRecord[]>([]);
  const [incomingJobs, setIncomingJobs] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [lastBookingSmsNotice, setLastBookingSmsNotice] =
    useState<BookingSmsNotice | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAccountVerified = Boolean(
    user && (user.emailVerified || Boolean(user.phoneNumber))
  );

  // Public technicians directory listener
  useEffect(() => {
    const path = 'technicians';
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        const docs: TechnicianRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const county = String(data.county || 'Nairobi');
          const fallbackCoords = getCountyCoordinates(county);
          return {
            id: d.id,
            ownerUid: String(data.ownerUid || ''),
            fullName: String(data.fullName || ''),
            trade: data.trade,
            county,
            town: String(data.town || ''),
            lat: typeof data.lat === 'number' ? data.lat : fallbackCoords.lat,
            lng: typeof data.lng === 'number' ? data.lng : fallbackCoords.lng,
            serviceRadiusKm: Number(data.serviceRadiusKm || 25),
            calloutFeeKes: Number(data.calloutFeeKes || 1000),
            hourlyRateKes: Number(data.hourlyRateKes || 1000),
            experienceYears: Number(data.experienceYears || 1),
            certification: String(data.certification || ''),
            bio: String(data.bio || ''),
            availableNow: Boolean(data.availableNow),
            remoteSupport: Boolean(data.remoteSupport),
            languages: Array.isArray(data.languages) ? data.languages.map(String) : ['Swahili'],
            photoUrl: String(data.photoUrl || ''),
            ratingAvg: Number(data.ratingAvg || 0),
            jobsCompleted: Number(data.jobsCompleted || 0),
          };
        });
        setFirestoreTechnicians(docs);
        setTechniciansLoading(false);
      },
      (err) => {
        setTechniciansLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, []);

  // Public reviews listener
  useEffect(() => {
    const path = 'reviews';
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        const list: ReviewRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorUid: String(data.authorUid || ''),
            authorName: String(data.authorName || ''),
            technicianId: String(data.technicianId || ''),
            bookingId: String(data.bookingId || ''),
            rating: Number(data.rating || 5),
            comment: String(data.comment || ''),
            createdAt: data.createdAt,
          };
        });
        setReviews(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, []);

  // Admin auto-seed for initial curated Kenyan technicians when empty
  useEffect(() => {
    if (
      !authReady ||
      !user ||
      !user.emailVerified ||
      user.email !== 'briannyagakyu@gmail.com' ||
      techniciansLoading
    ) {
      return;
    }

    const existingIds = new Set(firestoreTechnicians.map((t) => t.id));
    const missing = BUILT_IN_TECHNICIANS.filter((t) => !existingIds.has(t.id));
    if (missing.length === 0) return;

    missing.forEach(async (tech) => {
      try {
        await setDoc(doc(db, 'technicians', tech.id), {
          ownerUid: 'platform_verified',
          fullName: tech.fullName,
          trade: tech.trade,
          county: tech.county,
          town: tech.town,
          lat: tech.lat,
          lng: tech.lng,
          serviceRadiusKm: tech.serviceRadiusKm,
          calloutFeeKes: tech.calloutFeeKes,
          hourlyRateKes: tech.hourlyRateKes,
          experienceYears: tech.experienceYears,
          certification: tech.certification,
          bio: tech.bio,
          availableNow: tech.availableNow,
          remoteSupport: tech.remoteSupport,
          languages: tech.languages,
          photoUrl: tech.photoUrl,
          ratingAvg: tech.ratingAvg,
          jobsCompleted: tech.jobsCompleted,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Admin seed skipped or failed for', tech.id, err);
      }
    });
  }, [authReady, user, techniciansLoading, firestoreTechnicians]);

  // Private user profile + customer & technician bookings listeners (only for verified accounts)
  useEffect(() => {
    if (!authReady || !user || !isAccountVerified) {
      setPrivateProfile(null);
      setCustomerBookings([]);
      setIncomingJobs([]);
      setBookingsLoading(false);
      return;
    }

    setBookingsLoading(true);
    const profilePath = `users/${user.uid}/private/profile`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid, 'private', 'profile'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setPrivateProfile({
            uid: String(d.uid || user.uid),
            displayName: String(d.displayName || user.displayName || 'Kenyan User'),
            email: String(d.email || user.email || ''),
            mpesaPhone: String(d.mpesaPhone || user.phoneNumber || ''),
            county: String(d.county || 'Nairobi'),
            town: String(d.town || 'Nairobi CBD'),
            role: d.role === 'technician' ? 'technician' : 'customer',
          });
        } else {
          setPrivateProfile(null);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, profilePath);
      }
    );

    const bookingsPath = 'bookings';
    const qCustomer = query(collection(db, bookingsPath), where('customerId', '==', user.uid));
    const unsubCustomerBookings = onSnapshot(
      qCustomer,
      (snap) => {
        const list: BookingRecord[] = snap.docs.map((d) => {
          const raw = d.data() as Omit<BookingRecord, 'id'>;
          const fallback = getCountyCoordinates(raw.county || 'Nairobi');
          return {
            id: d.id,
            ...raw,
            lat: typeof raw.lat === 'number' ? raw.lat : fallback.lat,
            lng: typeof raw.lng === 'number' ? raw.lng : fallback.lng,
          };
        });
        setCustomerBookings(list);
        setBookingsLoading(false);
      },
      (err) => {
        setBookingsLoading(false);
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    const qTech = query(
      collection(db, bookingsPath),
      where('technicianOwnerUid', '==', user.uid)
    );
    const unsubTechBookings = onSnapshot(
      qTech,
      (snap) => {
        const list: BookingRecord[] = snap.docs.map((d) => {
          const raw = d.data() as Omit<BookingRecord, 'id'>;
          const fallback = getCountyCoordinates(raw.county || 'Nairobi');
          return {
            id: d.id,
            ...raw,
            lat: typeof raw.lat === 'number' ? raw.lat : fallback.lat,
            lng: typeof raw.lng === 'number' ? raw.lng : fallback.lng,
          };
        });
        setIncomingJobs(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
    );

    return () => {
      unsubProfile();
      unsubCustomerBookings();
      unsubTechBookings();
    };
  }, [authReady, user, isAccountVerified]);

  const technicians = useMemo(() => {
    const map = new window.Map<string, TechnicianRecord>();
    BUILT_IN_TECHNICIANS.forEach((t) => map.set(t.id, t));
    firestoreTechnicians.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [firestoreTechnicians]);

  const myTechnicianProfile = useMemo(() => {
    if (!user) return null;
    return firestoreTechnicians.find((t) => t.ownerUid === user.uid) || null;
  }, [firestoreTechnicians, user]);

  const signInWithGoogle = async (): Promise<User | null> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(msg);
      return null;
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<User> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      await sendEmailVerification(cred.user);
      setUser({ ...cred.user });
      return cred.user;
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      return cred.user;
    } finally {
      setSigningIn(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setAuthError(null);
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('No signed-in user found.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshAuthUser = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    setUser(auth.currentUser ? ({ ...auth.currentUser } as User) : null);
    return Boolean(auth.currentUser?.emailVerified);
  };

  const sendPhoneOtp = async (
    phone: string,
    verifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const e164 = toE164KenyanPhone(phone);
      return await signInWithPhoneNumber(auth, e164, verifier);
    } finally {
      setSigningIn(false);
    }
  };

  const verifyPhoneOtp = async (
    confirmation: ConfirmationResult,
    otpCode: string,
    fullName?: string
  ): Promise<User> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await confirmation.confirm(otpCode.trim());
      if (fullName && fullName.trim() && !cred.user.displayName) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      setUser({ ...cred.user });
      return cred.user;
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const savePrivateProfile = async (data: Omit<UserPrivateProfile, 'uid'>) => {
    if (!user) throw new Error('Please sign in first.');
    if (!isAccountVerified) {
      throw new Error('Please verify your email address before saving profile details.');
    }
    const normalizedPhone = data.mpesaPhone ? normalizeKenyanPhone(data.mpesaPhone) : '';
    if (normalizedPhone && !isValidKenyanPhone(normalizedPhone)) {
      throw new Error('Enter a valid Kenyan mobile number (e.g., 0712345678 or +254712345678).');
    }
    const path = `users/${user.uid}/private/profile`;
    const ref = doc(db, 'users', user.uid, 'private', 'profile');
    try {
      if (privateProfile) {
        await updateDoc(ref, {
          displayName: data.displayName.trim().slice(0, VALIDATION_LIMITS.fullNameMax),
          mpesaPhone: normalizedPhone,
          county: data.county.trim().slice(0, VALIDATION_LIMITS.countyMax),
          town: data.town.trim().slice(0, VALIDATION_LIMITS.townMax),
          role: data.role,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          uid: user.uid,
          displayName: data.displayName.trim().slice(0, VALIDATION_LIMITS.fullNameMax),
          email: (user.email || data.email || '').trim().slice(0, 120),
          mpesaPhone: normalizedPhone,
          county: data.county.trim().slice(0, VALIDATION_LIMITS.countyMax),
          town: data.town.trim().slice(0, VALIDATION_LIMITS.townMax),
          role: data.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const upsertTechnicianProfile = async (
    data: Omit<TechnicianRecord, 'id' | 'ownerUid' | 'ratingAvg' | 'jobsCompleted'>
  ): Promise<string> => {
    if (!user) throw new Error('Please sign in to publish your technician profile.');
    if (!isAccountVerified) {
      throw new Error('Please verify your email address first before publishing your Fundi profile.');
    }
    const docId = myTechnicianProfile ? myTechnicianProfile.id : `tech_${user.uid}`;
    const path = `technicians/${docId}`;
    const ref = doc(db, 'technicians', docId);

    const sanitizedPayload = {
      fullName: data.fullName.trim().slice(0, VALIDATION_LIMITS.fullNameMax),
      trade: data.trade,
      county: data.county.trim().slice(0, VALIDATION_LIMITS.countyMax),
      town: data.town.trim().slice(0, VALIDATION_LIMITS.townMax),
      lat: Number(data.lat),
      lng: Number(data.lng),
      serviceRadiusKm: Math.min(
        VALIDATION_LIMITS.serviceRadiusMax,
        Math.max(VALIDATION_LIMITS.serviceRadiusMin, Math.round(data.serviceRadiusKm))
      ),
      calloutFeeKes: Math.min(
        VALIDATION_LIMITS.calloutFeeMax,
        Math.max(VALIDATION_LIMITS.calloutFeeMin, Math.round(data.calloutFeeKes))
      ),
      hourlyRateKes: Math.min(
        VALIDATION_LIMITS.hourlyRateMax,
        Math.max(VALIDATION_LIMITS.hourlyRateMin, Math.round(data.hourlyRateKes))
      ),
      experienceYears: Math.min(
        VALIDATION_LIMITS.experienceMax,
        Math.max(VALIDATION_LIMITS.experienceMin, Math.round(data.experienceYears))
      ),
      certification: data.certification.trim().slice(0, VALIDATION_LIMITS.certificationMax),
      bio: data.bio.trim().slice(0, VALIDATION_LIMITS.bioMax),
      availableNow: Boolean(data.availableNow),
      remoteSupport: Boolean(data.remoteSupport),
      languages:
        data.languages.length > 0
          ? data.languages.slice(0, 5).map((l) => l.trim().slice(0, 30))
          : ['Swahili', 'English'],
      photoUrl: data.photoUrl.trim().slice(0, 300),
    };

    try {
      if (myTechnicianProfile) {
        await updateDoc(ref, {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ownerUid: user.uid,
          ...sanitizedPayload,
          ratingAvg: 0,
          jobsCompleted: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return docId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const createBooking = async (
    payload: Omit<
      BookingRecord,
      'id' | 'customerId' | 'mpesaRef' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Promise<string> => {
    if (!user) throw new Error('Please sign in to confirm your booking.');
    if (!isAccountVerified) {
      throw new Error('Please verify your email address before dispatching a technician.');
    }
    const normalizedPhone = normalizeKenyanPhone(payload.customerPhone);
    if (!isValidKenyanPhone(normalizedPhone)) {
      throw new Error('Provide a valid Kenyan phone number (07XXXXXXXX or +2547XXXXXXXX).');
    }

    setLastBookingSmsNotice(null);
    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const path = `bookings/${bookingId}`;
    try {
      await setDoc(doc(db, 'bookings', bookingId), {
        customerId: user.uid,
        customerName: payload.customerName.trim().slice(0, VALIDATION_LIMITS.fullNameMax),
        customerPhone: normalizedPhone,
        technicianId: payload.technicianId,
        technicianOwnerUid: payload.technicianOwnerUid,
        technicianName: payload.technicianName.trim().slice(0, VALIDATION_LIMITS.fullNameMax),
        trade: payload.trade.trim().slice(0, 60),
        county: payload.county.trim().slice(0, VALIDATION_LIMITS.countyMax),
        town: payload.town.trim().slice(0, VALIDATION_LIMITS.townMax),
        estateLandmark: payload.estateLandmark
          .trim()
          .slice(0, VALIDATION_LIMITS.estateLandmarkMax),
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        issueDescription: payload.issueDescription
          .trim()
          .slice(0, VALIDATION_LIMITS.issueDescriptionMax),
        serviceMode: payload.serviceMode,
        urgency: payload.urgency,
        scheduledDate: payload.scheduledDate.trim().slice(0, 40),
        estimatedCalloutKes: Math.max(0, Math.round(payload.estimatedCalloutKes)),
        mpesaRef: '',
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const smsRes = await fetch('/api/notifications/booking-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              bookingId,
              technicianId: payload.technicianId,
              technicianOwnerUid: payload.technicianOwnerUid,
              technicianName: payload.technicianName,
              customerName: payload.customerName.trim(),
              customerPhone: normalizedPhone,
              trade: payload.trade,
              county: payload.county,
              town: payload.town,
              estateLandmark: payload.estateLandmark.trim(),
              lat: Number(payload.lat),
              lng: Number(payload.lng),
              urgency: payload.urgency,
              serviceMode: payload.serviceMode,
              scheduledDate: payload.scheduledDate,
              estimatedCalloutKes: Math.max(0, Math.round(payload.estimatedCalloutKes)),
            }),
          });
          if (smsRes.ok) {
            const notice = (await smsRes.json()) as BookingSmsNotice;
            setLastBookingSmsNotice(notice);
          }
        }
      } catch {
        // Booking is already saved in Firestore; SMS dispatch failure does not fail booking
      }

      return bookingId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateBookingStatus = async (
    bookingId: string,
    nextStatus: BookingRecord['status']
  ) => {
    if (!user) throw new Error('Please sign in first.');
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const saveBookingMpesaRef = async (bookingId: string, mpesaRef: string) => {
    if (!user) throw new Error('Please sign in first.');
    const cleaned = mpesaRef.trim().toUpperCase().slice(0, VALIDATION_LIMITS.mpesaRefMax);
    if (cleaned.length < 6) {
      throw new Error('Enter a valid M-Pesa confirmation code (at least 6 characters).');
    }
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        mpesaRef: cleaned,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const submitReview = async (payload: {
    technicianId: string;
    bookingId: string;
    rating: number;
    comment: string;
  }) => {
    if (!user) throw new Error('Please sign in to submit a review.');
    if (!isAccountVerified) {
      throw new Error('Please verify your account before posting a review.');
    }
    const trimmed = payload.comment.trim().slice(0, VALIDATION_LIMITS.commentMax);
    if (trimmed.length < VALIDATION_LIMITS.commentMin) {
      throw new Error(
        `Please write at least ${VALIDATION_LIMITS.commentMin} characters in your review.`
      );
    }
    const path = `reviews/${payload.bookingId}`;
    try {
      await setDoc(doc(db, 'reviews', payload.bookingId), {
        authorUid: user.uid,
        authorName: (user.displayName || privateProfile?.displayName || 'Kenyan Customer')
          .trim()
          .slice(0, VALIDATION_LIMITS.fullNameMax),
        technicianId: payload.technicianId,
        bookingId: payload.bookingId,
        rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
        comment: trimmed,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateReview = async (payload: {
    reviewId: string;
    rating: number;
    comment: string;
  }) => {
    if (!user) throw new Error('Please sign in to update your review.');
    const trimmed = payload.comment.trim().slice(0, VALIDATION_LIMITS.commentMax);
    if (trimmed.length < VALIDATION_LIMITS.commentMin) {
      throw new Error(
        `Please write at least ${VALIDATION_LIMITS.commentMin} characters in your review.`
      );
    }
    const path = `reviews/${payload.reviewId}`;
    try {
      await updateDoc(doc(db, 'reviews', payload.reviewId), {
        rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
        comment: trimmed,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!user) throw new Error('Please sign in to delete your review.');
    const path = `reviews/${reviewId}`;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const fetchFundiSmsSettings = async (): Promise<FundiSmsSettings> => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sign in required.');
    const res = await fetch('/api/fundi/sms-settings', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not load SMS alert settings.');
    return data as FundiSmsSettings;
  };

  const saveFundiSmsSettings = async (payload: {
    phone: string;
    enabled: boolean;
    technicianId?: string;
  }) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sign in required.');
    const res = await fetch('/api/fundi/sms-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not save SMS alert settings.');
    return data as {
      ok: boolean;
      phoneE164: string;
      enabled: boolean;
      gatewayConfigured: boolean;
    };
  };

  const sendTestFundiSms = async (payload: { phone: string; fullName?: string }) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sign in required.');
    const res = await fetch('/api/notifications/test-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Could not send test SMS.');
    return data as BookingSmsNotice & { phoneE164: string };
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        isAccountVerified,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        resendVerificationEmail,
        refreshAuthUser,
        sendPhoneOtp,
        verifyPhoneOtp,
        signOut,
        privateProfile,
        savePrivateProfile,
        technicians,
        techniciansLoading,
        myTechnicianProfile,
        upsertTechnicianProfile,
        customerBookings,
        incomingJobs,
        bookingsLoading,
        lastBookingSmsNotice,
        createBooking,
        updateBookingStatus,
        saveBookingMpesaRef,
        reviews,
        submitReview,
        updateReview,
        deleteReview,
        fetchFundiSmsSettings,
        saveFundiSmsSettings,
        sendTestFundiSms,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFundi() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error('useFundi must be used inside FirebaseProvider');
  return ctx;
}
