/**
 * TTS Service — provider pattern.
 *
 * Current provider: Web Speech API (browser speechSynthesis).
 * Future: swap `provider` to a Google Cloud TTS implementation
 * that calls POST /api/tts — no UI component changes needed.
 */

// --------------- Web Speech provider ---------------

const VOICE_NAME_PRIORITY = ["google", "microsoft", "neural", "natural", "online"];

let cachedVoices = [];

function getSpeechSynthesis() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

function getSpeechUtteranceCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechSynthesisUtterance || null;
}

function normalizeLang(lang = "") {
  return String(lang).toLowerCase().replace("_", "-");
}

function refreshVoices() {
  const speechSynthesis = getSpeechSynthesis();
  if (!speechSynthesis) return cachedVoices;

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }

  return cachedVoices;
}

function findPreferredVoice(lang) {
  const voices = refreshVoices();
  const normalizedLang = normalizeLang(lang);
  const langPrefix = normalizedLang.split("-")[0];
  const sameLocale = voices.filter((voice) =>
    normalizeLang(voice.lang).startsWith(normalizedLang)
  );
  const sameFamily = voices.filter((voice) =>
    normalizeLang(voice.lang).startsWith(langPrefix)
  );
  const candidates = [...sameLocale, ...sameFamily].filter(
    (voice, index, list) => list.findIndex((item) => item.name === voice.name) === index
  );

  return (
    candidates.find((voice) =>
      VOICE_NAME_PRIORITY.some((keyword) =>
        voice.name.toLowerCase().includes(keyword)
      )
    ) ||
    candidates[0] ||
    null
  );
}

function estimateSpeechDurationMs(text, rate) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = Math.max(90, 175 * rate);
  return Math.max(1200, Math.ceil((wordCount / wordsPerMinute) * 60_000) + 900);
}

const webSpeechProvider = {
  _utterance: null,
  _onEndCallback: null,
  _startTimer: null,
  _endTimer: null,

  isSupported() {
    return Boolean(getSpeechSynthesis() && getSpeechUtteranceCtor());
  },

  _clearTimers() {
    if (this._startTimer) {
      window.clearTimeout(this._startTimer);
      this._startTimer = null;
    }

    if (this._endTimer) {
      window.clearTimeout(this._endTimer);
      this._endTimer = null;
    }
  },

  _finish(utterance) {
    if (this._utterance !== utterance) return;

    this._clearTimers();
    this._utterance = null;
    if (this._onEndCallback) this._onEndCallback();
  },

  speak(text, lang = "en-US", { rate = 0.85, pitch = 1 } = {}) {
    if (!this.isSupported()) return false;

    const speechSynthesis = getSpeechSynthesis();
    const SpeechSynthesisUtterance = getSpeechUtteranceCtor();

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0; // Max volume

    const preferred = findPreferredVoice(lang);
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => this._finish(utterance);
    utterance.onerror = () => this._finish(utterance);

    this._utterance = utterance;

    speechSynthesis.speak(utterance);
    speechSynthesis.resume?.();

    this._startTimer = window.setTimeout(() => {
      if (
        this._utterance === utterance &&
        !speechSynthesis.speaking &&
        !speechSynthesis.pending
      ) {
        this._finish(utterance);
      }
    }, 1200);

    this._endTimer = window.setTimeout(
      () => this._finish(utterance),
      estimateSpeechDurationMs(text, rate) + 3000
    );

    return true;
  },

  stop() {
    this._clearTimers();

    const speechSynthesis = getSpeechSynthesis();
    if (speechSynthesis) {
      speechSynthesis.cancel();
      speechSynthesis.resume?.();
    }

    this._utterance = null;
  },

  onEnd(callback) {
    this._onEndCallback = callback;
  },

  isSpeaking() {
    const speechSynthesis = getSpeechSynthesis();
    return Boolean(
      speechSynthesis &&
      (speechSynthesis.speaking || speechSynthesis.pending || this._utterance)
    );
  },
};

// --------------- Active provider ---------------

let provider = webSpeechProvider;

/**
 * Replace the internal TTS engine.
 * Call this once at app boot to swap to Google Cloud TTS.
 *
 * A provider must implement:
 *   speak(text, lang, opts?) → boolean
 *   stop()
 *   onEnd(callback)
 *   isSpeaking() → boolean
 *   isSupported() → boolean
 */
export function setTTSProvider(newProvider) {
  provider = newProvider;
}

export function speak(text, lang = "en-US", opts) {
  if (!text || !text.trim()) return false;
  return provider.speak(text, lang, opts);
}

export function stop() {
  provider.stop();
}

export function onEnd(callback) {
  provider.onEnd(callback);
}

export function isSpeaking() {
  return provider.isSpeaking();
}

export function isSupported() {
  return provider.isSupported();
}

// Pre-load/warm up voices in the browser so the first manual click can speak immediately.
if (typeof window !== "undefined") {
  const speechSynthesis = getSpeechSynthesis();
  if (speechSynthesis) {
    refreshVoices();

    const handleVoicesChanged = () => {
      refreshVoices();
    };

    if (typeof speechSynthesis.addEventListener === "function") {
      speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    } else if ("onvoiceschanged" in speechSynthesis) {
      const previousHandler = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = (event) => {
        previousHandler?.call(speechSynthesis, event);
        handleVoicesChanged();
      };
    }
  }
}
