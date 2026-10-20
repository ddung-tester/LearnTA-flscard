import { useRef, useState } from "react";
import { layAudioCauHoi } from "../services/courseApi";

// Nhiều câu cùng phần dùng chung một file nghe (audio_key): tải một lần, giữ object URL trong phiên
const dangTai = new Map();
const daTai = new Map();

function taiAudio(cau) {
  if (!dangTai.has(cau.audio_key)) {
    dangTai.set(
      cau.audio_key,
      layAudioCauHoi(cau.id)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          daTai.set(cau.audio_key, url);
          return url;
        })
        .catch((error) => {
          dangTai.delete(cau.audio_key);
          throw error;
        })
    );
  }
  return dangTai.get(cau.audio_key);
}

// Đăng xuất / đổi tài khoản: bỏ file nghe đã tải của tài khoản trước, trả bộ nhớ
if (typeof window !== "undefined") {
  window.addEventListener?.("auth:changed", () => {
    daTai.forEach((url) => URL.revokeObjectURL(url));
    daTai.clear();
    dangTai.clear();
  });
}

const CAC_TOC_DO = [0.75, 1];

/**
 * NgheAudioCauHoi — trình phát file nghe riêng tư của câu bài tập (cần đăng nhập nên tải qua API).
 * Bấm "Nghe" lần đầu mới tải; các câu sau cùng file hiện sẵn trình phát, không tự phát lại.
 * Có nút nghe chậm 0.75x cho người mới học.
 */
export default function NgheAudioCauHoi({ cau }) {
  const [trangThai, setTrangThai] = useState({ dangTai: false, loi: "", tuPhat: null });
  const [tocDo, setTocDo] = useState(1);
  const audioRef = useRef(null);
  const url = daTai.get(cau.audio_key);

  function chonTocDo(giaTri) {
    setTocDo(giaTri);
    if (audioRef.current) audioRef.current.playbackRate = giaTri;
  }

  async function batDauNghe() {
    setTrangThai({ dangTai: true, loi: "", tuPhat: null });
    try {
      await taiAudio(cau);
      setTrangThai({ dangTai: false, loi: "", tuPhat: cau.audio_key });
    } catch {
      setTrangThai({ dangTai: false, loi: "Không tải được file nghe. Thử lại nhé.", tuPhat: null });
    }
  }

  return (
    <div className="kh-nghe">
      {url ? (
        <>
          <audio
            key={cau.audio_key}
            ref={audioRef}
            className="kh-nghe__trinh-phat"
            controls
            src={url}
            autoPlay={trangThai.tuPhat === cau.audio_key}
            onLoadedMetadata={(event) => {
              event.currentTarget.playbackRate = tocDo;
            }}
          >
            Trình duyệt không phát được audio.
          </audio>
          <div className="kh-nghe__toc-do" role="group" aria-label="Tốc độ nghe">
            {CAC_TOC_DO.map((giaTri) => (
              <button
                key={giaTri}
                type="button"
                className="kh-chip"
                aria-pressed={tocDo === giaTri}
                onClick={() => chonTocDo(giaTri)}
              >
                {giaTri === 1 ? "Bình thường" : `Chậm ${giaTri}x`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          type="button"
          className="ui-button ui-button--primary kh-nghe__nut"
          onClick={batDauNghe}
          disabled={trangThai.dangTai}
        >
          {trangThai.dangTai ? "Đang tải bài nghe..." : "▶ Nghe bài"}
        </button>
      )}
      {trangThai.loi && <p className="kh-nghe__loi" role="alert">{trangThai.loi}</p>}
    </div>
  );
}
