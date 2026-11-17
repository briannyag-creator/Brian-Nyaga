import React, { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Send, X, ArrowRight, RotateCcw } from 'lucide-react';
import {
  ReviewRecord,
  TechnicianRecord,
  computeTechnicianRating,
  haversineKm,
} from '../lib/kenyaData';
import { formatKes } from '../lib/validation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedTrade?: string;
  recommendedTechnicians?: TechnicianRecord[];
}

interface CustomerAssistantBotProps {
  technicians: TechnicianRecord[];
  reviews: ReviewRecord[];
  selectedCounty: string;
  userLocation: { lat: number; lng: number } | null;
  onApplyTradeFilter: (trade: string) => void;
  onViewTechnician: (tech: TechnicianRecord) => void;
  onBookTechnician: (tech: TechnicianRecord) => void;
}

const STARTER_PROMPTS = [
  'My solar inverter is tripping — what should I check first?',
  'Recommend a top-rated electrician or plumber near me',
  'How do callout fees and M-Pesa payments work?',
  'Can I book a fundi for remote video triage?',
];

export function CustomerAssistantBot({
  technicians,
  reviews,
  selectedCounty,
  userLocation,
  onApplyTradeFilter,
  onViewTechnician,
  onBookTechnician,
}: CustomerAssistantBotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Habari! I am the FundiLink Customer Assistant. Ask me about troubleshooting an issue safely, choosing the right technician trade, pricing in KES, or finding top-rated fundis near you.',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const directorySummary = technicians.map((t) => {
        const rating = computeTechnicianRating(t, reviews);
        return {
          id: t.id,
          fullName: t.fullName,
          trade: t.trade,
          county: t.county,
          town: t.town,
          calloutFeeKes: t.calloutFeeKes,
          hourlyRateKes: t.hourlyRateKes,
          rating: rating.average,
          reviewCount: rating.reviewCount,
          availableNow: t.availableNow,
          remoteSupport: t.remoteSupport,
          distanceKm: userLocation ? haversineKm(userLocation, t) : null,
        };
      });

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextMessages
            .filter((m) => m.id !== 'welcome')
            .slice(-8)
            .map((m) => ({ role: m.role, text: m.text })),
          context: {
            selectedCounty,
            hasUserGps: Boolean(userLocation),
            technicians: directorySummary,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not reach the FundiLink assistant.');
      }

      const recIds: string[] = Array.isArray(data.recommendedTechnicianIds)
        ? data.recommendedTechnicianIds
        : [];
      const matchedTechs = recIds
        .map((id) => technicians.find((t) => t.id === id))
        .filter((t): t is TechnicianRecord => Boolean(t));

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Let me know your county and issue so I can help match you.',
        suggestedTrade: data.suggestedTrade || undefined,
        recommendedTechnicians: matchedTechs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to contact the assistant right now.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: 'Habari! How can I assist you with finding or booking a vetted Kenyan technician today?',
      },
    ]);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-lg border border-emerald-800 transition-colors"
        >
          <MessageSquareText className="w-4 h-4" aria-hidden="true" />
          <span>FundiLink Assistant</span>
        </button>
      )}

      {open && (
        <aside
          aria-label="FundiLink Customer Assistant"
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] z-50 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        >
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-900 text-white rounded-t-xl">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">
                FundiLink Customer Assistant
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Troubleshooting, KES pricing & technician matching
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                aria-label="Reset conversation"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FA] min-h-[260px]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.role === 'assistant' && msg.suggestedTrade && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyTradeFilter(msg.suggestedTrade!);
                      setOpen(false);
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                  >
                    <span>Filter directory: {msg.suggestedTrade}</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}

                {msg.role === 'assistant' &&
                  msg.recommendedTechnicians &&
                  msg.recommendedTechnicians.length > 0 && (
                    <div className="mt-2 w-full max-w-[92%] space-y-2">
                      {msg.recommendedTechnicians.map((tech) => {
                        const summary = computeTechnicianRating(tech, reviews);
                        return (
                          <div
                            key={tech.id}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {tech.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {tech.county} · {formatKes(tech.calloutFeeKes)} ·{' '}
                                {summary.average !== null
                                  ? `${summary.average.toFixed(1)}★`
                                  : 'New'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onViewTechnician(tech)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => onBookTechnician(tech)}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                              >
                                Book
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            ))}

            {messages.length === 1 && !sending && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Quick questions:
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="text-left px-3 py-2 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sending && (
              <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 inline-block">
                Thinking...
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-2.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an issue, trade, or fundi..."
              maxLength={1200}
              disabled={sending}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="p-2 text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors shrink-0"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
