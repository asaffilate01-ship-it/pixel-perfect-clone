import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AnswerInput = { text: string; method: "typed" | "voice"; confidence: number | null };

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Private answer entry: type it or speak it. The composer never judges the answer —
 * it hands the text to the caller, who sends it to the server for checking.
 */
export function AnswerComposer({
  onSubmit,
  onPass,
  disabled = false,
  busy = false,
  placeholder = "Type player, team or answer…",
}: {
  onSubmit: (answer: AnswerInput) => void;
  onPass?: (() => void) | undefined;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [method, setMethod] = useState<"typed" | "voice">("typed");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceSupported(!!getRecognition());
    return () => rec.current?.stop();
  }, []);

  const speak = () => {
    if (listening) {
      rec.current?.stop();
      setListening(false);
      return;
    }
    const r = getRecognition();
    if (!r) {
      setNotice("Voice entry isn’t available in this browser — type your answer instead.");
      input.current?.focus();
      return;
    }
    rec.current = r;
    r.lang = navigator.language || "en-GB";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (!last) return;
      const alt = last[0];
      if (!alt) return;
      setValue(alt.transcript);
      setMethod("voice");
      if (last.isFinal) {
        setConfidence(alt.confidence);
        setListening(false);
      }
    };
    r.onerror = () => {
      setListening(false);
      setNotice("Voice unavailable — type your answer instead.");
    };
    r.onend = () => setListening(false);
    setNotice("");
    setListening(true);
    r.start();
  };

  const send = () => {
    const clean = value.trim();
    if (!clean || disabled || busy) return;
    onSubmit({ text: clean, method, confidence: method === "voice" ? confidence : null });
    setValue("");
    setMethod("typed");
    setConfidence(null);
  };

  return (
    <div className={`game-card mt-4 p-4 transition-colors ${listening ? "border-t-4 border-primary" : ""}`}>
      <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
        Your private answer
      </p>
      <div
        className={`mt-3 flex items-center gap-2 rounded-full border bg-background/80 p-1.5 pl-4 transition-all shadow-inner ${
          listening ? "border-primary/60 shadow-[0_0_18px_-4px] shadow-primary/30" : "border-border"
        }`}
      >
        <input
          ref={input}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            setMethod("typed");
          }}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={listening ? "Listening…" : placeholder}
          aria-label="Your answer"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="button"
          size="icon"
          variant={listening ? "default" : "outline"}
          className={`rounded-full ${listening ? "" : "border-gold/50 text-gold hover:bg-gold/10 hover:text-gold"}`}
          aria-label={listening ? "Stop listening" : "Speak answer"}
          onClick={speak}
          disabled={disabled}
          title={voiceSupported ? "Speak your answer" : "Voice not supported here"}
        >
          {voiceSupported ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          className="rounded-full"
          aria-label="Submit answer"
          onClick={send}
          disabled={disabled || busy || !value.trim()}
        >
          <Send className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{notice || "Only the active player can answer; the server checks it and reveals the result to everyone."}</span>
        {onPass && (
          <button
            type="button"
            onClick={onPass}
            disabled={disabled || busy}
            className="inline-flex shrink-0 items-center gap-1 font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <SkipForward className="size-3.5" /> Pass
          </button>
        )}
      </div>
    </div>
  );
}
