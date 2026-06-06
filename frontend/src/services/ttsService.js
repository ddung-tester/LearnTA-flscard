/**
 * TTS Service — provider pattern.
 *
 * Current provider: Web Speech API (browser speechSynthesis).
 * Future: swap `provider` to a Google Cloud TTS implementation
 * that calls POST /api/tts — no UI component changes needed.
 */

// --------------- Web Speech provider ---------------

const webSpeechProvider = {
  _utterance: null,

  isSupported() {
    return "speechSynthesis" in window;
  },

  speak(text, lang = "en-US", { rate = 0.85, pitch = 1 } = {}) {
    if (!this.isSupported()) return false;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Try to pick a good English voice when available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith(lang) && (v.name.includes("Google") || v.name.includes("Neural"))
    );
    if (preferred) utterance.voice = preferred;

    this._utterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  },

  stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this._utterance = null;
  },

  onEnd(callback) {
    if (this._utterance) {
      this._utterance.onend = callback;
      this._utterance.onerror = callback;
    }
  },

  isSpeaking() {
    return this.isSupported() && window.speechSynthesis.speaking;
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
