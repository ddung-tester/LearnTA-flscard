import { useState } from "react";
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

/**
 * NgheAudioCauHoi — trình phát file nghe riêng tư của câu bài tập (cần đăng nhập nên tải qua API).
 * Bấm "Nghe" lần đầu mới tải; các câu sau cùng file hiện sẵn trình phát, không tự phát lại.
 */
export default function NgheAudioCauHoi({ cau }) {
  const [trangThai, setTrangThai] = useState({ dangTai: false, loi: "", tuPhat: null });
  const url = daTai.get(cau.audio_key);

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
        <audio
          key={cau.audio_key}
          className="kh-nghe__trinh-phat"
          controls
          src={url}
          autoPlay={trangThai.tuPhat === cau.audio_key}
        >
          Trình duyệt không phát được audio.
        </audio>
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
