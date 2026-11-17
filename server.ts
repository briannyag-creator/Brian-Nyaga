import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const FIREBASE_CONFIG_PATH = path.resolve(__dirname, 'firebase-applet-config.json');
const SMS_REGISTRY_PATH = path.resolve(__dirname, '.fundilink-sms-registry.json');

interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

interface TechnicianDirectorySummary {
  id: string;
  fullName: string;
  trade: string;
  county: string;
  town: string;
  calloutFeeKes: number;
  hourlyRateKes: number;
  rating: number | null;
  reviewCount: number;
  availableNow: boolean;
  remoteSupport: boolean;
  distanceKm?: number | null;
}

interface AssistantRequestBody {
  message?: string;
  history?: AssistantHistoryItem[];
  context?: {
    selectedCounty?: string;
    hasUserGps?: boolean;
    technicians?: TechnicianDirectorySummary[];
  };
}

interface SmsAlertLog {
  id: string;
  bookingId: string;
  createdAt: string;
  messageText: string;
  sent: boolean;
  provider: string | null;
  reason?: string;
}

interface FundiSmsEntry {
  ownerUid: string;
  technicianId: string;
  phoneE164: string;
  enabled: boolean;
  updatedAt: string;
  recentAlerts: SmsAlertLog[];
}

interface SmsRegistryStore {
  byOwnerUid: Record<string, FundiSmsEntry>;
}

function readFirebaseApiKey(): string {
  try {
    if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8'));
      return typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
    }
  } catch {
    // ignore read failure
  }
  return '';
}

async function verifyFirebaseUser(
  authHeader: string | undefined
): Promise<{ uid: string; email?: string; phoneNumber?: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  const apiKey = readFirebaseApiKey();
  if (!idToken || !apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: { localId?: string; email?: string; phoneNumber?: string }[];
    };
    const u = data.users?.[0];
    if (!u?.localId) return null;
    return {
      uid: u.localId,
      email: u.email,
      phoneNumber: u.phoneNumber,
    };
  } catch {
    return null;
  }
}

function readSmsRegistry(): SmsRegistryStore {
  try {
    if (fs.existsSync(SMS_REGISTRY_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SMS_REGISTRY_PATH, 'utf-8'));
      if (parsed && typeof parsed.byOwnerUid === 'object') {
        return parsed as SmsRegistryStore;
      }
    }
  } catch {
    // ignore corrupt/missing file
  }
  return { byOwnerUid: {} };
}

function writeSmsRegistry(store: SmsRegistryStore): void {
  fs.writeFileSync(SMS_REGISTRY_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function normalizeKenyanE164(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '').trim();
  if (/^\+254[17]\d{8}$/.test(cleaned)) return cleaned;
  if (/^0[17]\d{8}$/.test(cleaned)) return `+254${cleaned.slice(1)}`;
  return null;
}

function getConfiguredSmsGateway(): 'africastalking' | 'twilio' | null {
  if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
    return 'africastalking';
  }
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    return 'twilio';
  }
  return null;
}

async function sendSmsViaGateway(
  toPhoneE164: string,
  messageBody: string
): Promise<{
  sent: boolean;
  configured: boolean;
  provider: string | null;
  messageId?: string;
  reason?: string;
}> {
  const atKey = process.env.AFRICASTALKING_API_KEY;
  const atUser = process.env.AFRICASTALKING_USERNAME;
  const atSender = process.env.AFRICASTALKING_SENDER_ID;

  if (atKey && atUser) {
    const endpoint =
      atUser === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';
    const params = new URLSearchParams({
      username: atUser,
      to: toPhoneE164,
      message: messageBody,
    });
    if (atSender) {
      params.set('from', atSender);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: atKey,
      },
      body: params.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      SMSMessageData?: {
        Message?: string;
        Recipients?: { status?: string; messageId?: string }[];
      };
    };

    const recipient = data.SMSMessageData?.Recipients?.[0];
    if (res.ok && recipient && (recipient.status === 'Success' || recipient.status === 'Sent')) {
      return {
        sent: true,
        configured: true,
        provider: "Africa's Talking",
        messageId: recipient.messageId,
      };
    }

    return {
      sent: false,
      configured: true,
      provider: "Africa's Talking",
      reason:
        data.SMSMessageData?.Message ||
        recipient?.status ||
        `SMS gateway returned HTTP ${res.status}`,
    };
  }

  const twSid = process.env.TWILIO_ACCOUNT_SID;
  const twToken = process.env.TWILIO_AUTH_TOKEN;
  const twFrom = process.env.TWILIO_FROM_NUMBER;

  if (twSid && twToken && twFrom) {
    const params = new URLSearchParams({
      To: toPhoneE164,
      From: twFrom,
      Body: messageBody,
    });
    const authToken = Buffer.from(`${twSid}:${twToken}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
    };
    if (res.ok && data.sid) {
      return {
        sent: true,
        configured: true,
        provider: 'Twilio',
        messageId: data.sid,
      };
    }
    return {
      sent: false,
      configured: true,
      provider: 'Twilio',
      reason: data.message || `Twilio returned HTTP ${res.status}`,
    };
  }

  return {
    sent: false,
    configured: false,
    provider: null,
    reason:
      'SMS gateway credentials (AFRICASTALKING_API_KEY or TWILIO_ACCOUNT_SID) are not configured in Settings > Secrets.',
  };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Fetch Fundi SMS Dispatch Alert settings & recent alert prompts
  app.get('/api/fundi/sms-settings', async (req, res) => {
    const authUser = await verifyFirebaseUser(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const store = readSmsRegistry();
    const entry = store.byOwnerUid[authUser.uid];
    const gateway = getConfiguredSmsGateway();

    return res.json({
      phoneE164: entry?.phoneE164 || authUser.phoneNumber || '',
      enabled: entry ? entry.enabled : true,
      gatewayConfigured: Boolean(gateway),
      gatewayProvider:
        gateway === 'africastalking'
          ? "Africa's Talking"
          : gateway === 'twilio'
            ? 'Twilio'
            : null,
      recentAlerts: entry?.recentAlerts || [],
    });
  });

  // Save Fundi SMS Dispatch Alert settings (stored privately by ownerUid)
  app.post('/api/fundi/sms-settings', async (req, res) => {
    const authUser = await verifyFirebaseUser(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { phone, enabled, technicianId } = (req.body || {}) as {
      phone?: string;
      enabled?: boolean;
      technicianId?: string;
    };

    const rawPhone = typeof phone === 'string' ? phone.trim() : '';
    const phoneE164 = rawPhone ? normalizeKenyanE164(rawPhone) : '';
    if (rawPhone && !phoneE164) {
      return res.status(400).json({
        error: 'Enter a valid Kenyan mobile number (07XXXXXXXX or +2547XXXXXXXX).',
      });
    }

    const store = readSmsRegistry();
    const prev = store.byOwnerUid[authUser.uid];
    store.byOwnerUid[authUser.uid] = {
      ownerUid: authUser.uid,
      technicianId:
        typeof technicianId === 'string' && technicianId
          ? technicianId
          : prev?.technicianId || `tech_${authUser.uid}`,
      phoneE164: phoneE164 || '',
      enabled: typeof enabled === 'boolean' ? enabled : true,
      updatedAt: new Date().toISOString(),
      recentAlerts: prev?.recentAlerts || [],
    };
    writeSmsRegistry(store);

    const gateway = getConfiguredSmsGateway();
    return res.json({
      ok: true,
      phoneE164: store.byOwnerUid[authUser.uid].phoneE164,
      enabled: store.byOwnerUid[authUser.uid].enabled,
      gatewayConfigured: Boolean(gateway),
    });
  });

  // Send a test dispatch SMS prompt to the signed-in fundi
  app.post('/api/notifications/test-sms', async (req, res) => {
    const authUser = await verifyFirebaseUser(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { phone, fullName } = (req.body || {}) as {
      phone?: string;
      fullName?: string;
    };
    const store = readSmsRegistry();
    const entry = store.byOwnerUid[authUser.uid];
    const targetRaw = (typeof phone === 'string' && phone.trim()) || entry?.phoneE164 || '';
    const phoneE164 = normalizeKenyanE164(targetRaw);

    if (!phoneE164) {
      return res.status(400).json({
        error: 'Enter a valid Kenyan mobile number (07XXXXXXXX or +2547XXXXXXXX) first.',
      });
    }

    const previewText = `[FundiLink TEST] Habari ${fullName || 'Fundi'}! Instant booking SMS alerts are active on ${phoneE164}. When a customer books you, job details & Google Maps pin will arrive here.`;
    const delivery = await sendSmsViaGateway(phoneE164, previewText);

    return res.json({
      ...delivery,
      phoneE164,
      previewText,
    });
  });

  // Dispatch prompt SMS notification to the booked technician when a booking is created
  app.post('/api/notifications/booking-sms', async (req, res) => {
    const authUser = await verifyFirebaseUser(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const {
      bookingId,
      technicianId,
      technicianOwnerUid,
      technicianName,
      customerName,
      customerPhone,
      trade,
      county,
      town,
      estateLandmark,
      lat,
      lng,
      urgency,
      serviceMode,
      scheduledDate,
      estimatedCalloutKes,
    } = (req.body || {}) as Record<string, unknown>;

    if (typeof bookingId !== 'string' || !bookingId) {
      return res.status(400).json({ error: 'Missing bookingId.' });
    }

    const urgencyTag = urgency === 'emergency' ? 'URGENT' : 'SCHEDULED';
    const modeTag = serviceMode === 'remote_triage' ? 'Video Triage' : 'Onsite';
    const mapPin =
      typeof lat === 'number' && typeof lng === 'number'
        ? `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`
        : '';

    const previewText = `[FundiLink ${urgencyTag}] New ${String(trade || 'service')} (${modeTag}) in ${String(town || '')}, ${String(county || '')}. Client: ${String(customerName || '')} (${String(customerPhone || '')}). Site: ${String(estateLandmark || '')}. Time: ${String(scheduledDate || 'Today')}. Callout: KES ${Number(estimatedCalloutKes || 0).toLocaleString('en-KE')}. ${mapPin} Accept in FundiLink -> My Bookings.`;

    const store = readSmsRegistry();
    const ownerKey =
      typeof technicianOwnerUid === 'string' && technicianOwnerUid
        ? technicianOwnerUid
        : '';

    let entry = ownerKey ? store.byOwnerUid[ownerKey] : undefined;
    if (!entry && typeof technicianId === 'string') {
      entry = Object.values(store.byOwnerUid).find(
        (item) => item.technicianId === technicianId
      );
    }

    let result: {
      sent: boolean;
      configured: boolean;
      provider: string | null;
      reason?: string;
    };

    if (!entry) {
      result = {
        sent: false,
        configured: Boolean(getConfiguredSmsGateway()),
        provider: null,
        reason: `${String(technicianName || 'This technician')} has not registered a mobile number for SMS alerts yet. Dispatch saved in My Bookings.`,
      };
    } else if (!entry.enabled) {
      result = {
        sent: false,
        configured: Boolean(getConfiguredSmsGateway()),
        provider: null,
        reason: 'Technician has paused SMS alerts; dispatch appears in Incoming Fundi Jobs.',
      };
    } else if (!entry.phoneE164) {
      result = {
        sent: false,
        configured: Boolean(getConfiguredSmsGateway()),
        provider: null,
        reason: 'Technician SMS number is empty; dispatch appears in Incoming Fundi Jobs.',
      };
    } else {
      result = await sendSmsViaGateway(entry.phoneE164, previewText);
    }

    if (entry) {
      const alertLog: SmsAlertLog = {
        id: `sms_${Date.now()}`,
        bookingId,
        createdAt: new Date().toISOString(),
        messageText: previewText,
        sent: result.sent,
        provider: result.provider,
        reason: result.reason,
      };
      entry.recentAlerts = [alertLog, ...(entry.recentAlerts || [])].slice(0, 20);
      store.byOwnerUid[entry.ownerUid] = entry;
      writeSmsRegistry(store);
    }

    return res.json({
      ...result,
      previewText,
    });
  });

  // Gemini Customer Support & Dispatch Assistant endpoint
  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const body = (req.body || {}) as AssistantRequestBody;
      const message = typeof body.message === 'string' ? body.message.trim() : '';

      if (!message) {
        return res.status(400).json({ error: 'Please enter a message for the assistant.' });
      }
      if (message.length > 1200) {
        return res
          .status(400)
          .json({ error: 'Message is too long. Keep questions under 1,200 characters.' });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'Assistant service is unavailable because GEMINI_API_KEY is not configured in Settings > Secrets.',
        });
      }

      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
      const directoryList = Array.isArray(body.context?.technicians)
        ? body.context.technicians.slice(0, 25)
        : [];
      const selectedCounty = body.context?.selectedCounty || 'All';
      const hasUserGps = Boolean(body.context?.hasUserGps);

      const directorySnapshot = directoryList
        .map(
          (t) =>
            `- id=${t.id} | ${t.fullName} | ${t.trade} | ${t.county} (${t.town}) | callout KES ${t.calloutFeeKes}, hourly KES ${t.hourlyRateKes} | rating=${t.rating !== null ? t.rating.toFixed(1) : 'New'} (${t.reviewCount} reviews) | availableNow=${t.availableNow} | remoteTriage=${t.remoteSupport}${typeof t.distanceKm === 'number' ? ` | distance=${t.distanceKm.toFixed(1)}km` : ''}`
        )
        .join('\n');

      const conversationTranscript = history
        .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const systemInstruction = `You are the FundiLink Kenya Customer Support & Dispatch Assistant.
Your job is to help Kenyan customers troubleshoot urgent household/business/auto issues safely, pick the right trade specialist, understand how FundiLink works, and match them with real technicians from the live directory snapshot below.

Platform facts:
- Coverage: All 47 Kenyan counties (onsite dispatch + Remote Video Triage).
- Trades: "Electrical & Solar", "Plumbing & Borehole", "Refrigeration & AC", "Automotive Diagnostics", "ICT & Fiber", "Appliance Repair", "Welding & Masonry".
- Payments: Transparent KES callout fee + hourly rate. Customers pay via M-Pesa after inspection and can record the M-Pesa confirmation code in "My Bookings".
- GPS & Maps: Customers can tap "Near Me" or "Map View" to sort fundis by GPS distance, and pin their exact service location when booking.
- Reviews: After a technician marks a job "Completed", customers can rate (1-5 stars) and comment on the technician in "My Bookings" or the technician's profile modal.

Guidelines:
- Keep answers concise, warm, practical, and clear (2-5 short sentences or brief bullet steps).
- For electrical, gas, or major water emergencies, always mention immediate safety precautions first (e.g., switch off the main breaker/MCB or close the main stopcock).
- Only recommend technician IDs that actually appear in the Live Directory Snapshot below. Never invent technician names, phone numbers, or prices.
- If recommending a trade filter, use one of the exact 7 trade names above (or empty string if none).

Current Customer Context:
- Selected County Filter: ${selectedCounty}
- GPS Enabled: ${hasUserGps ? 'Yes' : 'No'}

Live Directory Snapshot:
${directorySnapshot || 'No technicians loaded yet.'}`;

      const contents = conversationTranscript
        ? `${conversationTranscript}\nCustomer: ${message}`
        : `Customer: ${message}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'Helpful, concise response to the customer in plain text or simple bullet lines.',
              },
              suggestedTrade: {
                type: Type.STRING,
                description:
                  'Optional exact trade category name from the 7 supported trades, or empty string if none.',
              },
              recommendedTechnicianIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Up to 3 matching technician IDs from the Live Directory Snapshot, or empty array.',
              },
            },
            required: ['reply', 'suggestedTrade', 'recommendedTechnicianIds'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Assistant returned an empty response.' });
      }

      let parsed: {
        reply?: string;
        suggestedTrade?: string;
        recommendedTechnicianIds?: string[];
      };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText,
          suggestedTrade: '',
          recommendedTechnicianIds: [],
        };
      }

      const validIds = new Set(directoryList.map((t) => t.id));
      const safeTechIds = Array.isArray(parsed.recommendedTechnicianIds)
        ? parsed.recommendedTechnicianIds.filter((id) => validIds.has(id)).slice(0, 3)
        : [];

      return res.json({
        reply: parsed.reply || 'How can I help you find a technician today?',
        suggestedTrade: parsed.suggestedTrade || '',
        recommendedTechnicianIds: safeTechIds,
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
      const rawMessage =
        errorObj?.message || 'Unable to reach the FundiLink customer assistant right now.';

      if (status === 400 || status === 403) {
        return res.status(status).json({
          error:
            'Assistant request rejected. Please verify GEMINI_API_KEY in the Settings > Secrets panel.',
        });
      }
      if (status === 429) {
        return res.status(429).json({
          error: 'Assistant quota limit reached right now. Please try again shortly.',
        });
      }
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: rawMessage,
      });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FundiLink server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FundiLink server:', err);
  process.exit(1);
});
