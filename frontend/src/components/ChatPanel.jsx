import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, Send, User, X } from 'lucide-react';
import { fetchWeatherByCity, sendChatMessage } from '../lib/weatherApi';
import { easeOut } from '../theme/theme';

function parseCityFromQuestion(text, fallbackCity) {
  const ctx = text.match(/context:\s*([^)\n]+)/i);
  if (ctx) return ctx[1].split(',')[0].trim();
  const named = text.match(
    /\b(?:in|for|at)\s+([A-Za-z][A-Za-z\s.'-]{1,40}?)(?:\s+right now|\s*\?|$)/i
  );
  if (named) return named[1].trim();
  return fallbackCity || '';
}

function formatLocalReply(state) {
  return (
    `Right now in ${state.location || state.city}: ${state.temperature}°, ` +
    `${state.conditionText}. Feels like ${state.feelsLike}°. ` +
    `Humidity ${state.humidity}%, wind ${state.windSpeed} ${state.speedUnit}.`
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-sky-600 text-white' : 'bg-black/50 text-sky-200'
        }`}
        aria-hidden
      >
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed text-white ${
          isUser ? 'rounded-br-sm bg-sky-600/90' : 'rounded-bl-sm bg-black/55'
        }`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
      >
        <p className={`mb-1 text-[10px] uppercase tracking-wider ${isUser ? 'text-sky-100' : 'text-sky-200'}`}>
          {isUser ? 'You' : 'ATMOS'}
        </p>
        {content}
      </div>
    </div>
  );
}

export default function ChatPanel({ open, onClose, onOpen, weather }) {
  const [messages, setMessages] = useState([
    { role: 'model', content: 'Ask me about the weather anywhere.' },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const previous = messages
      .filter(
        (m) =>
          m.content !== 'Ask me about the weather anywhere.' &&
          !m.content.includes('temporarily unavailable')
      )
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }));
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const res = await sendChatMessage(text, sessionId, previous);
      setSessionId(res.session_id);
      setMessages((m) => [...m, { role: 'model', content: res.reply }]);
    } catch {
      try {
        const city = parseCityFromQuestion(text, weather?.city);
        if (!city) throw new Error('no city');
        const state = await fetchWeatherByCity(city, weather?.unit || 'metric');
        setMessages((m) => [...m, { role: 'model', content: formatLocalReply(state) }]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: 'model',
            content:
              'I could not reach the chat service. Ask about a city by name, or check that the API is running on port 8000.',
          },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <motion.button
          type="button"
          onClick={onOpen}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          className="fixed bottom-24 right-5 z-chat flex h-12 w-12 items-center justify-center rounded-full glass-strong text-text-primary md:bottom-8"
          aria-label="Open weather chat"
        >
          <MessageCircle size={20} />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: easeOut }}
            className="fixed bottom-24 right-5 z-chat flex h-[420px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border border-white/25 bg-black/25 text-white shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-md md:bottom-24"
          >
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-sky-300" />
                <p className="text-sm font-medium">Weather chat</p>
              </div>
              <button type="button" onClick={onClose} className="text-white" aria-label="Close chat">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {busy && (
                <p className="pl-10 text-xs text-white/50">ATMOS is checking the weather…</p>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-white/15 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the weather..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/55 outline-none"
              />
              <button type="submit" disabled={busy} className="text-primary-strong" aria-label="Send">
                <Send size={16} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
