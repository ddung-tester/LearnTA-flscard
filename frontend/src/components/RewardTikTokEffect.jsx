import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Overlay thưởng (động cơ hạt canvas + motion): tách chunk riêng, tải trước lúc trình duyệt rảnh
// để khi đạt mốc thưởng không phải chờ tải.
const taiRewardMagicOverlay = () => import("./RewardMagicOverlay");
const RewardMagicOverlay = lazy(taiRewardMagicOverlay);
import "./RewardTikTokEffect.css";

export const CAU_HINH_REWARD_QUIZ = { // eslint-disable-line react-refresh/only-export-components
  triggerCount: 10,
  opacity: 0.78,
  duration: 10800,
  videoDuration: 8000,
  fadeOutMs: 1000,
  volume: 0.80,
  manifestSrc: "/media/milestones/videos.json",
};

const VIDEO_READY_STATE_CAN_DRAW = 2;
// Video gương (cổng phải, máy tính): lệch ít thì chỉnh tốc độ phát cho đuổi kịp (không khựng), lệch nhiều mới tua
const DO_LECH_GUONG_TUA = 0.25;
const DO_LECH_GUONG_CHINH_TOC = 0.04;
const REWARD_VIDEO_READY_TIMEOUT_MS = 2600;
// Tải trước video sau khi trang học đã tải xong dữ liệu + JS (không tranh băng thông lúc mở trang trên 4G);
// thưởng chỉ đến sau nhiều câu đúng nên vẫn tải kịp, chưa kịp thì màn "tụ phép" chờ như cũ
const TRE_TAI_VIDEO_MS = 3000;
// Nhớ hàng đợi video giữa các lần vào trang: vào lại dùng đúng file đã nằm trong cache HTTP
// thay vì xáo lại và tải một video khác (~2 MB mỗi lần)
const KHOA_HANG_DOI_VIDEO = "learnta_hang_doi_video";

function docHangDoiVideo(danhSach) {
  try {
    const luu = JSON.parse(localStorage.getItem(KHOA_HANG_DOI_VIDEO) || "null");
    const hopLe =
      Array.isArray(luu?.queue) &&
      luu.queue.length === danhSach.length &&
      luu.queue.every((src) => danhSach.includes(src)) &&
      Number.isInteger(luu.index);
    return hopLe ? luu : null;
  } catch {
    return null;
  }
}

function ghiHangDoiVideo(queue, index) {
  try {
    localStorage.setItem(KHOA_HANG_DOI_VIDEO, JSON.stringify({ queue, index }));
  } catch {
    // Không lưu được thì lần sau xáo lại như cũ
  }
}

function RewardTikTokEffect({
  active,
  lanKichHoat = 0,
  config = CAU_HINH_REWARD_QUIZ,
  progressOriginRef,
  progressEndpointRef,
  onRequestClose,
  onHideComplete,
  combo = 0,
  tenseExamples = null,
  // Từ vừa làm đúng: viết quanh vòng phép
  tuVung = "",
}) {
  const videoRef = useRef(null);
  const videoGuongRef = useRef(null);
  const canvasRefs = useRef({});
  const lanDaDungVideoRef = useRef(0);
  const videoDaPhatGanNhatRef = useRef("");
  const videoQueueRef = useRef([]);        // hàng đợi video đã trộn
  const videoQueueIndexRef = useRef(0);   // vị trí tiếp theo trong hàng đợi
  const [danhSachVideo, setDanhSachVideo] = useState([]);
  const [loiVideo, setLoiVideo] = useState(false);
  const [daDoViewport, setDaDoViewport] = useState(false);

  useEffect(() => {
    const henTaiTruoc = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 1500));
    const huyTaiTruoc = window.cancelIdleCallback ?? window.clearTimeout;
    const id = henTaiTruoc(() => {
      taiRewardMagicOverlay().catch(() => {});
    });
    return () => huyTaiTruoc(id);
  }, []);
  const [coTheHienThi, setCoTheHienThi] = useState(false);
  const [giamChuyenDong, setGiamChuyenDong] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  // Bản video đã tải trọn vào bộ nhớ: phát từ đây thì không còn chờ mạng giữa chừng (giật trên 4G)
  const [banTaiSan, setBanTaiSan] = useState({ src: "", url: "" });
  const dangRenderRewardRef = useRef(false);
  const [videoSanSang, setVideoSanSang] = useState(false);
  const [dangRenderReward, setDangRenderReward] = useState(false);
  const [dangFadeOut, setDangFadeOut] = useState(false);
  const [choPhepPhatVideo, setChoPhepPhatVideo] = useState(false);
  const [daTatTieng, setDaTatTieng] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const lanTimelineRewardRef = useRef(0);
  const cleanupFadeOutRef = useRef(null);
  const videoReadyTimeoutRef = useRef(null);
  const daYeuCauDongRef = useRef(false);

  const batDauPhatVideo = useCallback(() => {
    setChoPhepPhatVideo(true);
  }, []);

  const yeuCauDongReward = useCallback(() => {
    if (daYeuCauDongRef.current) return;

    daYeuCauDongRef.current = true;
    onRequestClose?.();
  }, [onRequestClose]);

  // Fisher-Yates shuffle
  function tronMang(danhSach) {
    const result = [...danhSach];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Tạo lại hàng đợi, tránh trùng video cuối chu kỳ trước với đầu chu kỳ mới
  function xayDungHangDoiVideo(danhSach) {
    const shuffled = tronMang(danhSach);
    if (shuffled.length > 1 && shuffled[0] === videoDaPhatGanNhatRef.current) {
      const swapIdx = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
      [shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]];
    }
    videoQueueRef.current = shuffled;
    videoQueueIndexRef.current = 0;
    ghiHangDoiVideo(shuffled, 0);
  }

  // Xem trước video tiếp theo KHÔNG tiến hàng đợi (dùng khi preload)
  function xemVideoTiepTheo(danhSach) {
    if (danhSach.length === 0) return "";
    if (danhSach.length === 1) return danhSach[0];

    // Hết hàng đợi thì xáo luôn bây giờ, để video được tải sẵn đúng là video sẽ phát
    if (videoQueueIndexRef.current >= videoQueueRef.current.length) {
      xayDungHangDoiVideo(danhSach);
    }
    return videoQueueRef.current[videoQueueIndexRef.current] || "";
  }

  // Lấy video tiếp theo VÀ tiến hàng đợi (dùng khi thực sự phát)
  // Đảm bảo không lặp lại bất kỳ video nào cho đến khi toàn bộ danh sách đã phát
  function layVideoTiepTheo(danhSach) {
    if (danhSach.length === 0) return "";
    if (danhSach.length === 1) return danhSach[0];

    if (videoQueueIndexRef.current >= videoQueueRef.current.length) {
      xayDungHangDoiVideo(danhSach);
    }

    const video = videoQueueRef.current[videoQueueIndexRef.current] || "";
    videoQueueIndexRef.current += 1;
    ghiHangDoiVideo(videoQueueRef.current, videoQueueIndexRef.current);
    if (video) videoDaPhatGanNhatRef.current = video;
    return video;
  }

  // Ánh video hắt ra giữa (máy tính): vẽ cả khung vào canvas rất nhỏ, CSS phóng to + làm mờ
  function veAnhHat(video, canvas) {
    if (!canvas || !video.videoWidth) return;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  const demKhungAnhHatRef = useRef(0);
  // Hai cổng là thẻ <video> gốc (không chép khung bằng JS); chỉ còn ánh hắt 16×9 lấy màu từ video.
  // Ánh hắt bị CSS làm mờ 42px: mỗi lần đổi là làm mờ lại cả lớp lớn → chỉ cập nhật 1/4 số khung (vẫn đổi màu mượt)
  function veTatCaCanvas(video) {
    if (demKhungAnhHatRef.current++ % 4 === 0) veAnhHat(video, canvasRefs.current.anhHat);
  }

  // Máy tính: video gương chạy theo video chính (cùng blob, tắt tiếng)
  function dongBoVideoGuong(video) {
    const guong = videoGuongRef.current;
    if (!guong) return;
    const lech = video.currentTime - guong.currentTime;
    if (Math.abs(lech) > DO_LECH_GUONG_TUA) {
      guong.currentTime = video.currentTime;
      guong.playbackRate = 1;
    } else {
      guong.playbackRate = Math.abs(lech) > DO_LECH_GUONG_CHINH_TOC ? 1 + Math.max(-0.1, Math.min(0.1, lech)) : 1;
    }
    if (guong.paused) guong.play().catch(() => {});
  }

  const hoanTatDongReward = useCallback(() => {
    setDangRenderReward(false);
    setDangFadeOut(false);
    setChoPhepPhatVideo(false);
    setLoiVideo(false);
    setDaTatTieng(false);
    lanTimelineRewardRef.current = 0;
    onHideComplete?.();
  }, [onHideComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1280px)");
    const capNhat = () => {
      const doRongConLai = window.innerWidth - window.innerHeight * 1.125;
      setCoTheHienThi(media.matches && doRongConLai >= 416);
      setDaDoViewport(true);
    };

    capNhat();
    media.addEventListener("change", capNhat);
    window.addEventListener("resize", capNhat);

    return () => {
      media.removeEventListener("change", capNhat);
      window.removeEventListener("resize", capNhat);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const capNhat = () => setGiamChuyenDong(media.matches);

    capNhat();
    media.addEventListener("change", capNhat);

    return () => {
      media.removeEventListener("change", capNhat);
    };
  }, []);

  useEffect(() => {
    if (!daDoViewport) return undefined;

    let daHuy = false;

    async function napDanhSachVideo() {
      try {
        const response = await fetch(config.manifestSrc, { cache: "no-cache" });
        if (!response.ok) throw new Error("Khong doc duoc celebration manifest");

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Celebration manifest khong hop le");

        // Video nam cung thu muc voi manifest
        const basePath = config.manifestSrc.slice(0, config.manifestSrc.lastIndexOf("/"));

        const danhSachHopLe = data
          .filter((tenFile) => typeof tenFile === "string" && tenFile.trim())
          .map((tenFile) => tenFile.trim())
          .map((tenFile) =>
            tenFile.startsWith("/") ? tenFile : `${basePath}/${tenFile}`
          );

        if (daHuy) return;

        // Chỉ tải trước video sắp phát (thẻ <video> ẩn bên dưới, preload="auto");
        // không tải cả danh sách (~70 MB) — nghẽn mạng và bộ giải mã, giật trên điện thoại
        setDanhSachVideo(danhSachHopLe);
      } catch {
        if (!daHuy) setDanhSachVideo([]);
      }
    }

    napDanhSachVideo();

    return () => {
      daHuy = true;
    };
  }, [daDoViewport, config.manifestSrc]);

  useEffect(() => {
    dangRenderRewardRef.current = dangRenderReward;
    if (!dangRenderReward) return undefined;
    // Trang học phía sau bị lớp phủ che gần hết: tạm dừng mọi animation của nó để luồng chính rảnh cho hiệu ứng + video
    document.documentElement.classList.add("reward-dang-phat");
    return () => document.documentElement.classList.remove("reward-dang-phat");
  }, [dangRenderReward]);

  // Tải trọn đúng một video sắp phát vào bộ nhớ khi chưa tới mốc thưởng rồi phát bằng blob URL.
  // Không dựa vào cache HTTP: Vercel mặc định must-revalidate, mỗi đoạn video lại hỏi server → khựng trên 4G.
  useEffect(() => {
    if (!videoSrc || dangRenderReward || banTaiSan.src === videoSrc) return undefined;
    const huy = new AbortController();
    const henRanh = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 0));
    const huyRanh = window.cancelIdleCallback ?? window.clearTimeout;
    let idRanh = 0;
    const henGio = window.setTimeout(() => {
      idRanh = henRanh(taiVideo, { timeout: 4000 });
    }, TRE_TAI_VIDEO_MS);
    const taiVideo = () => fetch(videoSrc, { signal: huy.signal, priority: "low" })
      .then((res) => {
        if (!res.ok) throw new Error("Khong tai duoc video");
        return res.blob();
      })
      .then((blob) => {
        // Xong giữa lúc đang thưởng: không đổi src của video đang phát
        if (huy.signal.aborted || dangRenderRewardRef.current) return;
        setBanTaiSan({ src: videoSrc, url: URL.createObjectURL(blob) });
      })
      .catch(() => {});
    return () => {
      window.clearTimeout(henGio);
      huyRanh(idRanh);
      huy.abort();
    };
  }, [videoSrc, dangRenderReward, banTaiSan.src]);

  // Chỉ giữ một bản trong bộ nhớ: thả bản cũ khi đã có bản mới hoặc khi rời trang
  useEffect(() => {
    const url = banTaiSan.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [banTaiSan.url]);

  // Danh sách video thay đổi (manifest mới): dùng tiếp hàng đợi đã lưu nếu còn khớp, không thì xáo lại
  useEffect(() => {
    const luu = docHangDoiVideo(danhSachVideo);
    videoQueueRef.current = luu ? luu.queue : [];
    videoQueueIndexRef.current = luu ? luu.index : 0;
  }, [danhSachVideo]);

  useEffect(() => {
    if (!daDoViewport || videoSrc || danhSachVideo.length === 0) return;

    // Preload: chỉ xem trước, không tiến hàng đợi
    setVideoSrc(xemVideoTiepTheo(danhSachVideo));
  }, [daDoViewport, danhSachVideo, videoSrc]);

  useEffect(() => {
    const fadeOutMs = config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs;

    if (cleanupFadeOutRef.current) {
      window.clearTimeout(cleanupFadeOutRef.current);
      cleanupFadeOutRef.current = null;
    }

    if (active) {
      daYeuCauDongRef.current = false;
      setDangRenderReward(true);
      setDangFadeOut(false);
      setLoiVideo(false);
      return undefined;
    }

    if (!dangRenderReward) return undefined;

    setDangFadeOut(true);
    cleanupFadeOutRef.current = window.setTimeout(() => {
      hoanTatDongReward();

      if (danhSachVideo.length > 0) {
        // Preload video tiếp theo trong hàng đợi (không tiến hàng đợi)
        const videoTiepTheo = xemVideoTiepTheo(danhSachVideo);

        if (videoTiepTheo && videoTiepTheo !== videoSrc) {
          setVideoSrc(videoTiepTheo);
        }
      }
    }, fadeOutMs);

    return () => {
      if (cleanupFadeOutRef.current) {
        window.clearTimeout(cleanupFadeOutRef.current);
        cleanupFadeOutRef.current = null;
      }
    };
  }, [
    active,
    dangRenderReward,
    danhSachVideo,
    videoSrc,
    config.fadeOutMs,
    hoanTatDongReward,
  ]);

  useEffect(() => {
    if (!active || !dangRenderReward || !daDoViewport) return undefined;

    if (lanKichHoat !== lanTimelineRewardRef.current) {
      lanTimelineRewardRef.current = lanKichHoat;
      setChoPhepPhatVideo(false);

      const node = progressOriginRef?.current ?? progressEndpointRef?.current;
      setOriginRect(node ? node.getBoundingClientRect() : null);

      const video = videoRef.current;
      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // Ignore seek errors while the browser is still attaching metadata.
        }
      }
    }

    setDangFadeOut(false);

    if (danhSachVideo.length === 0) {
      setLoiVideo(true);
      return undefined;
    }

    if (lanKichHoat > 0 && lanKichHoat !== lanDaDungVideoRef.current) {
      // Lấy video tiếp theo từ hàng đợi shuffle (tránh lặp lại)
      const videoDangDung = layVideoTiepTheo(danhSachVideo);

      lanDaDungVideoRef.current = lanKichHoat;

      if (videoDangDung) {
        setVideoSrc(videoDangDung);
      }
    } else if (!videoSrc) {
      setVideoSrc(layVideoTiepTheo(danhSachVideo));
    }

    return undefined;
  }, [
    active,
    dangRenderReward,
    coTheHienThi,
    daDoViewport,
    danhSachVideo,
    lanKichHoat,
    progressOriginRef,
    progressEndpointRef,
    videoSanSang,
    videoSrc,
  ]);

  useEffect(() => {
    if (!videoSrc) {
      setVideoSanSang(false);
      return;
    }

    const video = videoRef.current;
    if (video && video.readyState >= VIDEO_READY_STATE_CAN_DRAW) {
      setVideoSanSang(true);
      window.requestAnimationFrame(() => {
        veTatCaCanvas(video);
      });
      return undefined;
    }

    setVideoSanSang(false);
    video?.load();
  }, [videoSrc]);

  useEffect(() => {
    if (!active || !videoSrc || !videoSanSang || choPhepPhatVideo) {
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    let animationId = window.requestAnimationFrame(() => {
      veTatCaCanvas(video);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [active, choPhepPhatVideo, videoSanSang, videoSrc]);

  useEffect(() => {
    if (lanKichHoat === 0) {
      lanDaDungVideoRef.current = 0;
    }
  }, [lanKichHoat]);

  useEffect(
    () => () => {
      if (cleanupFadeOutRef.current) {
        window.clearTimeout(cleanupFadeOutRef.current);
      }
      if (videoReadyTimeoutRef.current) {
        window.clearTimeout(videoReadyTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (videoReadyTimeoutRef.current) {
      window.clearTimeout(videoReadyTimeoutRef.current);
      videoReadyTimeoutRef.current = null;
    }

    if (
      !active ||
      !dangRenderReward ||
      !videoSrc ||
      videoSanSang ||
      loiVideo
    ) {
      return undefined;
    }

    videoReadyTimeoutRef.current = window.setTimeout(() => {
      // Sự kiện canplay có thể bị lỡ (thẻ gắn khi dữ liệu đã có sẵn trong cache) — hỏi thẳng video trước khi bỏ
      if ((videoRef.current?.readyState ?? 0) >= VIDEO_READY_STATE_CAN_DRAW) setVideoSanSang(true);
      else setLoiVideo(true);
      videoReadyTimeoutRef.current = null;
    }, REWARD_VIDEO_READY_TIMEOUT_MS);

    return () => {
      if (videoReadyTimeoutRef.current) {
        window.clearTimeout(videoReadyTimeoutRef.current);
        videoReadyTimeoutRef.current = null;
      }
    };
  }, [active, dangRenderReward, loiVideo, videoSanSang, videoSrc]);

  useEffect(() => {
    if (
      !active ||
      giamChuyenDong ||
      !videoSrc ||
      !videoSanSang ||
      !choPhepPhatVideo
    ) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) return undefined;

    const volume = config.volume ?? CAU_HINH_REWARD_QUIZ.volume;

    let animationId;
    let khungVideoId;

    // Chỉ vẽ khi video có khung mới (~30 fps) thay vì mỗi lần màn hình làm tươi (60–120 Hz)
    const coKhungVideo = typeof video.requestVideoFrameCallback === "function";
    function veKhungHinh() {
      veTatCaCanvas(video);
      if (demKhungAnhHatRef.current % 30 === 0) dongBoVideoGuong(video);
      if (coKhungVideo) khungVideoId = video.requestVideoFrameCallback(veKhungHinh);
      else animationId = window.requestAnimationFrame(veKhungHinh);
    }

    video.volume = volume;
    video.muted = false;

    // Video gương bắt đầu cùng nhịp với video chính, sau đó chỉ cần chỉnh nhẹ
    const guong = videoGuongRef.current;
    if (guong) {
      try {
        guong.currentTime = video.currentTime;
      } catch {
        // Chưa có metadata: lần đồng bộ sau sẽ kéo về
      }
      guong.play().catch(() => {});
    }

    video
      .play()
      .then(() => {
        setDaTatTieng(false);
      })
      .catch(() => {
        // Autoplay policy: Trình duyệt chặn âm thanh -> Tự động chuyển sang chế độ tắt tiếng
        video.muted = true;
        setDaTatTieng(true);
        return video.play();
      })
      .then(() => dongBoVideoGuong(video))
      .catch(() => {
        // Chặn hoàn toàn video (tiết kiệm pin hoặc block triệt để) -> Kích hoạt fallback đồ họa
        setLoiVideo(true);
      });

    setDangFadeOut(false);
    if (coTheHienThi) veKhungHinh();

    return () => {
      window.cancelAnimationFrame(animationId);
      if (khungVideoId !== undefined) video.cancelVideoFrameCallback?.(khungVideoId);
      video.pause();
      videoGuongRef.current?.pause();
      video.volume = volume;
    };
  }, [
    active,
    choPhepPhatVideo,
    giamChuyenDong,
    lanKichHoat,
    videoSrc,
    videoSanSang,
    config.volume,
    coTheHienThi,
  ]);

  const toggleAmThanh = useCallback(
    (e) => {
      e?.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      if (video.muted) {
        video.muted = false;
        const volume = config.volume ?? CAU_HINH_REWARD_QUIZ.volume;
        video.volume = volume;
        video
          .play()
          .then(() => {
            setDaTatTieng(false);
          })
          .catch(() => {
            // Nếu trình duyệt vẫn chặn thì duy trì trạng thái
          });
      } else {
        video.muted = true;
        setDaTatTieng(true);
      }
    },
    [config.volume]
  );

  useEffect(() => {
    if (!active || !dangRenderReward) return undefined;

    // Trường hợp fallback: lỗi video, giảm chuyển động, hoặc không có src
    // → dùng thời gian cố định, không chờ video
    if (loiVideo || giamChuyenDong || !videoSrc) {
      const timer = window.setTimeout(
        yeuCauDongReward,
        config.duration ?? CAU_HINH_REWARD_QUIZ.duration
      );
      return () => window.clearTimeout(timer);
    }

    // Video chưa sẵn sàng hoặc chưa được phép phát
    // → chưa đặt timer, tránh tắt reward trước khi video bắt đầu
    if (!choPhepPhatVideo || !videoSanSang) return undefined;

    // Video đang phát: tính thời gian đóng dựa trên thời lượng thực tế còn lại
    // để tránh bị cắt đột ngột giữa chừng
    const video = videoRef.current;
    const coThongTinThoiLuong =
      video &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      Number.isFinite(video.currentTime);

    const thoiGianConLai = coThongTinThoiLuong
      ? (video.duration - video.currentTime) * 1000 + 800 // buffer 800ms
      : config.duration ?? CAU_HINH_REWARD_QUIZ.duration;

    const duration = Math.max(
      config.duration ?? CAU_HINH_REWARD_QUIZ.duration,
      thoiGianConLai
    );

    const timer = window.setTimeout(yeuCauDongReward, duration);
    return () => window.clearTimeout(timer);
  }, [
    active,
    dangRenderReward,
    choPhepPhatVideo,
    config.duration,
    giamChuyenDong,
    loiVideo,
    yeuCauDongReward,
    videoSanSang,
    videoSrc,
  ]);

  if (!daDoViewport || !dangRenderReward) return null;

  const style = {
    "--reward-opacity": config.opacity ?? CAU_HINH_REWARD_QUIZ.opacity,
    "--reward-fade-duration": `${config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs}ms`,
  };

  if (typeof document === "undefined") return null;

  // Thẻ <video> hiện thẳng trong cổng — trình duyệt giải mã và vẽ bằng phần cứng, không chép khung bằng JS.
  // Máy tính: cổng trái là video chính (có tiếng), cổng phải là video gương cùng nguồn, tắt tiếng, lật ngang.
  const compact = !coTheHienThi;
  const srcPhat = banTaiSan.src === videoSrc ? banTaiSan.url : videoSrc;
  const theVideo = !loiVideo && videoSrc && (
    <video
      key={videoSrc}
      ref={(el) => {
        videoRef.current = el;
        if (el) {
          el.defaultMuted = true;
          el.playsInline = true;
          el.setAttribute("playsinline", "");
          el.setAttribute("webkit-playsinline", "");
          // Lần thưởng đầu, overlay tải lười bị treo (Suspense) một nhịp: React dựng sẵn <video> khi chưa gắn vào trang,
          // canplay bắn lúc đó bị bỏ → gắn vào đã có dữ liệu thì coi là sẵn sàng luôn, không chờ hết 2,6 s
          if (el.readyState >= VIDEO_READY_STATE_CAN_DRAW) setVideoSanSang(true);
        }
      }}
      className="reward-magic__video"
      src={srcPhat}
      preload="auto"
      muted
      playsInline
      onLoadedData={(event) => {
        const video = event.currentTarget; // React đặt lại currentTarget = null sau khi xử lý xong sự kiện
        if (video.readyState >= VIDEO_READY_STATE_CAN_DRAW) {
          setVideoSanSang(true);
          window.requestAnimationFrame(() => {
            veTatCaCanvas(video);
          });
        }
      }}
      onCanPlay={(event) => {
        const video = event.currentTarget;
        setVideoSanSang(true);
        window.requestAnimationFrame(() => {
          veTatCaCanvas(video);
        });
      }}
      onCanPlayThrough={() => setVideoSanSang(true)}
      onEnded={yeuCauDongReward}
      onError={() => setLoiVideo(true)}
    />
  );

  const theVideoGuong = !compact && !loiVideo && videoSrc && (
    <video
      key={`${videoSrc}-guong`}
      ref={(el) => {
        videoGuongRef.current = el;
        if (el) el.defaultMuted = true;
      }}
      className="reward-magic__video"
      src={srcPhat}
      preload="auto"
      muted
      playsInline
      disablePictureInPicture
    />
  );

  const rewardLayer = (
    <div
      className={`streak-celebration-effect ${loiVideo ? "streak-celebration-effect--fallback" : ""} ${
        dangFadeOut ? "streak-celebration-effect--fade-out" : ""
      }`}
      aria-hidden="true"
      style={style}
    >
      {dangRenderReward && (
        <Suspense fallback={null}>
          <RewardMagicOverlay
            active={dangRenderReward}
            sequenceKey={lanKichHoat}
            fadeOut={dangFadeOut}
            hasError={giamChuyenDong || loiVideo || !videoSrc}
            videoSrc={videoSrc}
            videoReady={giamChuyenDong || videoSanSang || loiVideo || !videoSrc}
            originRect={originRect}
            canvasRefs={canvasRefs}
            videoNodes={compact ? { center: theVideo } : { left: theVideo, right: theVideoGuong }}
            onPortalOpen={giamChuyenDong ? undefined : batDauPhatVideo}
            compact={compact}
            combo={combo}
            tenseExamples={tenseExamples}
            tuVung={tuVung}
          />
        </Suspense>
      )}
      {/* Nút bật/tắt âm thanh tinh tế khi video đang phát */}
      {!loiVideo && videoSrc && choPhepPhatVideo && (
        <button
          type="button"
          className="streak-celebration-effect__sound-btn"
          onClick={toggleAmThanh}
          title={daTatTieng ? "Bấm để bật âm thanh" : "Bấm để tắt âm thanh"}
          aria-label={daTatTieng ? "Bấm để bật âm thanh" : "Bấm để tắt âm thanh"}
        >
          {daTatTieng ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              <span>Bật tiếng</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span>Tắt tiếng</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return createPortal(rewardLayer, document.body);
}

export default RewardTikTokEffect;
