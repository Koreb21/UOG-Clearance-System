import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionResultList = {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function VoiceInput({ onTranscript, className = "", disabled = false }: VoiceInputProps) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const SpeechRecognition = getSpeechRecognition();

  const isSupported = SpeechRecognition != null;

  const getLang = useCallback(() => {
    const lang = i18n.language ?? "en";
    return lang.startsWith("am") ? "am-ET" : "en-US";
  }, [i18n.language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.lang = getLang();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setListening(true); };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setError(t("micPermissionDenied"));
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(t("voiceError"));
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError(t("voiceError"));
      setListening(false);
    }
  }, [SpeechRecognition, getLang, onTranscript, t]);

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  if (!isSupported) {
    return (
      <span
        title={t("voiceNotSupported")}
        className={`inline-flex cursor-not-allowed items-center justify-center rounded-lg p-2 text-outline/40 ${className}`}
        aria-label={t("voiceNotSupported")}
      >
        <span className="material-symbols-outlined text-[18px]">mic_off</span>
      </span>
    );
  }

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={listening ? stopListening : startListening}
        aria-label={listening ? t("stopListening") : t("startListening")}
        title={listening ? t("stopListening") : t("startListening")}
        className={`
          inline-flex items-center justify-center rounded-lg p-2 transition-all
          ${listening
            ? "bg-error text-on-error shadow-lg shadow-error/30 animate-pulse"
            : "bg-surface-container-high text-on-surface-variant hover:bg-primary-fixed hover:text-on-primary-fixed-variant"
          }
          disabled:cursor-not-allowed disabled:opacity-40
        `}
      >
        <span className="material-symbols-outlined text-[18px]" style={listening ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          {listening ? "mic" : "mic_none"}
        </span>
      </button>
      {error && (
        <p className="absolute top-full mt-1 w-48 rounded bg-error-container px-2 py-1 text-center text-[10px] text-on-error-container shadow z-10">
          {error}
        </p>
      )}
    </div>
  );
}
