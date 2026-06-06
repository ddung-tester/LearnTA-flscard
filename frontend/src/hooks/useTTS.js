import { useCallback, useEffect, useRef, useState } from "react";
import * as tts from "../services/ttsService";

/**
 * React hook wrapping ttsService.
 *
 * Returns { speak, stop, isPlaying }.
 * - speak(text, lang?) — stops any current speech then speaks.
 * - stop() — cancels current speech.
 * - isPlaying — true while audio is playing.
 */
function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tts.stop();
    };
  }, []);

  const stop = useCallback(() => {
    tts.stop();
    if (mountedRef.current) setIsPlaying(false);
  }, []);

  const speak = useCallback(
    (text, lang = "en-US") => {
      if (!text || !text.trim()) return;
      if (!tts.isSupported()) return;

      // Stop previous speech before starting new one
      tts.stop();

      const started = tts.speak(text, lang);
      if (!started) return;

      if (mountedRef.current) setIsPlaying(true);

      tts.onEnd(() => {
        if (mountedRef.current) setIsPlaying(false);
      });
    },
    []
  );

  return { speak, stop, isPlaying };
}

export default useTTS;
