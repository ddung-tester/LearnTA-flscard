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
      const trimmedText = String(text || "").trim();
      if (!trimmedText || !tts.isSupported()) {
        if (mountedRef.current) setIsPlaying(false);
        return false;
      }

      const started = tts.speak(trimmedText, lang);
      if (!started) {
        if (mountedRef.current) setIsPlaying(false);
        return false;
      }

      if (mountedRef.current) setIsPlaying(true);

      tts.onEnd(() => {
        if (mountedRef.current) setIsPlaying(false);
      });

      return true;
    },
    []
  );

  return { speak, stop, isPlaying };
}

export default useTTS;
