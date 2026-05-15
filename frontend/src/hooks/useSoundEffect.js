import { useCallback, useEffect, useRef } from "react";

function taoAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function useSoundEffect(src, { volume = 0.9 } = {}) {
  const audioCtxRef = useRef(null);
  const bufferRef = useRef(null);
  const htmlAudioRef = useRef(null);
  const pendingResumeRef = useRef(null);

  useEffect(() => {
    let daHuy = false;
    const ctx = taoAudioContext();
    audioCtxRef.current = ctx;

    const htmlAudio = new Audio(src);
    htmlAudio.preload = "auto";
    htmlAudio.volume = volume;
    htmlAudio.load();
    htmlAudioRef.current = htmlAudio;

    if (ctx) {
      fetch(src)
        .then((response) => response.arrayBuffer())
        .then((buffer) => ctx.decodeAudioData(buffer))
        .then((decoded) => {
          if (!daHuy) bufferRef.current = decoded;
        })
        .catch(() => {});
    }

    function resumeAudio() {
      if (document.visibilityState === "hidden") return;
      if (ctx?.state === "suspended") {
        pendingResumeRef.current = ctx
          .resume()
          .catch(() => {})
          .finally(() => {
            pendingResumeRef.current = null;
          });
      }
    }

    window.addEventListener("pointerdown", resumeAudio, { passive: true });
    window.addEventListener("keydown", resumeAudio);
    window.addEventListener("focus", resumeAudio);
    document.addEventListener("visibilitychange", resumeAudio);

    return () => {
      daHuy = true;
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
      window.removeEventListener("focus", resumeAudio);
      document.removeEventListener("visibilitychange", resumeAudio);
      htmlAudio.pause();
      htmlAudioRef.current = null;
      bufferRef.current = null;
      audioCtxRef.current = null;
      pendingResumeRef.current = null;
      ctx?.close().catch(() => {});
    };
  }, [src, volume]);

  return useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;

    function playDecodedBuffer() {
      if (!ctx || !buffer || ctx.state === "closed") return false;

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = buffer;
      gainNode.gain.value = volume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      return true;
    }

    if (ctx && buffer && ctx.state !== "closed") {
      try {
        if (ctx.state === "suspended") {
          pendingResumeRef.current ||= ctx
            .resume()
            .catch(() => {})
            .finally(() => {
              pendingResumeRef.current = null;
            });

          pendingResumeRef.current.then(() => {
            try {
              playDecodedBuffer();
            } catch {}
          });
          return;
        }

        if (playDecodedBuffer()) return;
      } catch {}
    }

    const audio = htmlAudioRef.current;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }, [volume]);
}

export default useSoundEffect;
