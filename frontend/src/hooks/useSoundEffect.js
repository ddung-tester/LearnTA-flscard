import { useCallback, useEffect, useRef } from "react";

function taoAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function canhBaoAmThanh(message, error) {
  if (!import.meta.env.DEV) return;
  console.warn(`[sound-effect] ${message}`, error || "");
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
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Khong tai duoc audio ${src}: ${response.status}`);
          }

          return response;
        })
        .then((response) => response.arrayBuffer())
        .then((buffer) => ctx.decodeAudioData(buffer))
        .then((decoded) => {
          if (!daHuy) bufferRef.current = decoded;
        })
        .catch((error) => {
          canhBaoAmThanh(`Khong decode duoc ${src}; se dung HTMLAudio fallback.`, error);
        });
    }

    function resumeAudio() {
      if (document.visibilityState === "hidden") return;
      if (ctx?.state === "suspended") {
        pendingResumeRef.current = ctx
          .resume()
          .catch((error) => {
            canhBaoAmThanh("Khong resume duoc AudioContext.", error);
          })
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
      ctx?.close().catch((error) => {
        canhBaoAmThanh("Khong dong duoc AudioContext.", error);
      });
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
            .catch((error) => {
              canhBaoAmThanh("Khong resume duoc AudioContext truoc khi phat.", error);
            })
            .finally(() => {
              pendingResumeRef.current = null;
            });

          pendingResumeRef.current.then(() => {
            try {
              playDecodedBuffer();
            } catch (error) {
              canhBaoAmThanh(`Khong phat duoc decoded buffer ${src}.`, error);
            }
          });
          return;
        }

        if (playDecodedBuffer()) return;
      } catch (error) {
        canhBaoAmThanh(`Khong phat duoc decoded buffer ${src}.`, error);
      }
    }

    const audio = htmlAudioRef.current;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch((error) => {
        canhBaoAmThanh(`Trinh duyet chan phat ${src}.`, error);
      });
    } catch (error) {
      canhBaoAmThanh(`Khong phat duoc ${src}.`, error);
    }
  }, [src, volume]);
}

export default useSoundEffect;
