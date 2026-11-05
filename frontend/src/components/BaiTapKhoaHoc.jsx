import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import useTTS from "../hooks/useTTS";
import { banPhaoGiay, rungMay } from "../utils/hieuUng";
import { phatAm } from "../utils/amThanh";
import NgheAudioCauHoi from "./NgheAudioCauHoi";
import ThanhTiepTuc from "./common/ThanhTiepTuc";
import useDuaONhapVaoTam from "../hooks/useDuaONhapVaoTam";
import { useHoiLearnBot } from "../contexts/ChatbotContext";
import { danhGiaGiaiThich, giaiThichCauHoi, layBanDichCauHoi } from "../services/courseApi";
import { luuTraLoiCoHangCho, soCauDangCho, theoDoiHangCho } from "../services/hangChoTraLoi";
import {
  capNhatGiaiThich,
  dungSoanNen,
  khoGiaiThichCua,
  napCauHoi,
  soanNen,
  uuTienSoan,
} from "../utils/soanTruocGiaiThich";
import {
  khoaGiaiThich,
  laTraLoiDung,
  layCauBaiChinh,
  layDapAnHienThi,
  nhomPhanBaiTap,
  phanBaiTap,
  demChoTrong,
  phanTichLoiGo,
  tachChuDam,
  tachViDuKhac,
  taoCauHoiLearnBot,
  timGiaiThichSan,
} from "../utils/baiTapKhoaHoc";

const TAT_CA = "tat-ca";
// Các câu chưa đúng ở lần trả lời gần nhất (kể cả câu chưa làm), để làm tiếp từ lần trước
const CON_LAI = "con-lai";
// Chọn cả một nhóm nguồn (vd "nhom:Bài thi"); khoá khác là một phần cụ thể (vd "exam/quiz_1")
const TIEN_TO_NHOM = "nhom:";

function Icon({ children, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconDung = (props) => <Icon {...props}><path d="M20 6 9 17l-5-5" /></Icon>;
const IconSai = (props) => <Icon {...props}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
const IconLoa = (props) => (
  <Icon {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </Icon>
);
const IconDich = (props) => (
  <Icon {...props}>
    <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
  </Icon>
);
const IconGiaiThich = (props) => (
  <Icon {...props}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.74V16h8v-1.26A7 7 0 0 0 12 2z" />
  </Icon>
);

function DoanChuDam({ text }) {
  return tachChuDam(text).map((doan, index) =>
    doan.dam ? <strong key={index}>{doan.text}</strong> : <span key={index}>{doan.text}</span>
  );
}

// Lời giải thích + câu "Ví dụ khác" tách thành khối riêng bên dưới
function VanBanGiaiThich({ text }) {
  const { chinh, viDu } = tachViDuKhac(text);
  return (
    <>
      <p className="kh-ai__van-ban">
        <DoanChuDam text={chinh} />
      </p>
      {viDu && (
        <div className="kh-ai__vi-du">
          <p className="kh-ai__vi-du-nhan">Ví dụ khác</p>
          <p className="kh-ai__vi-du-cau">
            <DoanChuDam text={viDu} />
          </p>
        </div>
      )}
    </>
  );
}

// Server gửi bản đầy đủ (đã soạn sẵn đúng câu này, hoặc AI viết lại cả lời) thì bỏ phần hiện sẵn
const CO_PHAN_DUNG = /(^|\n)\s*(\*\*)?(Đúng vì|Nhớ)/;

// 👍/👎 dưới lời giải thích đã viết xong; 👎 thì AI viết lại (mỗi câu một lần trong lượt)
function DanhGiaGiaiThich({ trangThai, onDanhGia, onHoiThem }) {
  if (!trangThai.xong || !onDanhGia) return null;
  const { danhGia } = trangThai;
  const hoiThem = onHoiThem && (
    <button type="button" className="kh-lien-ket" onClick={onHoiThem}>
      Hỏi LearnBot thêm
    </button>
  );
  if (danhGia === "tot" || danhGia === "da-viet") {
    return (
      <p className="kh-ai__danh-gia-ghi-chu">
        {danhGia === "tot" ? "Cảm ơn bạn đã đánh giá!" : "AI đã viết lại lời giải thích."} {hoiThem}
      </p>
    );
  }
  if (danhGia === "dang-viet") return <p className="kh-ai__danh-gia-ghi-chu">AI đang viết lại…</p>;
  return (
    <div className="kh-ai__danh-gia">
      <span>{danhGia === "loi" ? "Chưa viết lại được, thử lại?" : "Giải thích này dễ hiểu không?"}</span>
      <button type="button" className="kh-ai__nut-danh-gia" onClick={() => onDanhGia(true)} aria-label="Dễ hiểu">
        👍
      </button>
      <button type="button" className="kh-ai__nut-danh-gia" onClick={() => onDanhGia(false)} aria-label="Chưa ổn, nhờ AI viết lại">
        👎
      </button>
      {hoiThem}
    </div>
  );
}

function GiaiThichAI({ trangThai, onThuLai, onDanhGia, onHoiThem }) {
  if (!trangThai) return null;
  // Câu gõ sai kiểu mới: "Đúng vì" + "Nhớ" hiện ngay, dòng "Sai vì" hiện dần khi AI viết xong
  if (trangThai.phanSau) {
    return (
      <section className="kh-ai" aria-busy={!trangThai.text && !trangThai.loi} aria-live="polite">
        <h4 className="kh-ai__tieu-de">
          <IconGiaiThich className="kh-ai__icon" />
          Giải thích của AI
        </h4>
        {trangThai.text ? null : trangThai.loi ? (
          <p className="kh-ai__loi">
            {trangThai.loi}{" "}
            <button type="button" className="kh-lien-ket" onClick={onThuLai}>
              Thử lại
            </button>
          </p>
        ) : (
          <>
            <div className="kh-ai__cho" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="sr-only">Đang soạn lời giải thích</span>
          </>
        )}
        <VanBanGiaiThich text={trangThai.text ? `${trangThai.text.trim()}\n${trangThai.phanSau}` : trangThai.phanSau} />
        <DanhGiaGiaiThich trangThai={trangThai} onDanhGia={onDanhGia} onHoiThem={onHoiThem} />
      </section>
    );
  }
  return (
    <section className="kh-ai" aria-busy={trangThai.dangTai} aria-live="polite">
      <h4 className="kh-ai__tieu-de">
        <IconGiaiThich className="kh-ai__icon" />
        Giải thích của AI
      </h4>
      {trangThai.dangTai ? (
        <>
          <div className="kh-ai__cho" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="sr-only">Đang soạn lời giải thích</span>
        </>
      ) : trangThai.loi ? (
        <p className="kh-ai__loi">
          {trangThai.loi}{" "}
          <button type="button" className="kh-lien-ket" onClick={onThuLai}>
            Thử lại
          </button>
        </p>
      ) : (
        <>
          <VanBanGiaiThich text={trangThai.text} />
          <DanhGiaGiaiThich trangThai={trangThai} onDanhGia={onDanhGia} onHoiThem={onHoiThem} />
        </>
      )}
    </section>
  );
}

// So chữ đã gõ với đáp án gần nhất: tô ký tự sai/thiếu + nhận ra lỗi hay gặp (tức thì, không cần AI)
function SoSanhChuGo({ traLoi, dapAnDung }) {
  const phanTich = phanTichLoiGo(traLoi, dapAnDung);
  return (
    <div className="kh-so-sanh">
      {phanTich.nhan && <p className="kh-so-sanh__nhan">{phanTich.nhan}</p>}
      <p className="kh-so-sanh__dong">
        <span className="kh-so-sanh__nhan-dong">Bạn gõ</span>
        <span lang="en">
          {phanTich.doanDaGo.map((doan, i) => (
            <span key={i} className={`kh-so-sanh__doan kh-so-sanh__doan--${doan.kieu}`}>{doan.text}</span>
          ))}
        </span>
      </p>
      <p className="kh-so-sanh__dong">
        <span className="kh-so-sanh__nhan-dong">Đáp án</span>
        <strong lang="en">
          {phanTich.doanDapAn.map((doan, i) => (
            <span key={i} className={`kh-so-sanh__doan kh-so-sanh__doan--${doan.kieu}`}>{doan.text}</span>
          ))}
        </strong>
      </p>
    </div>
  );
}

function traLoiHienThi(cau, traLoi) {
  return cau.type === "multiple_choice" ? layDapAnHienThi({ ...cau, answer_key: traLoi }) : traLoi;
}

function loiNhan(tiLe) {
  if (tiLe >= 0.9) return "Bạn đã nắm chắc phần này.";
  if (tiLe >= 0.6) return "Khá ổn. Xem lại các câu sai bên dưới rồi làm lại.";
  return "Nên đọc lại phần lý thuyết, sau đó làm lại các câu sai.";
}

/** cacCau: [{ cau, kq }] — lần trả lời đầu của từng câu trong lượt (lượt hỏi lại không tính điểm) */
function TongKet({ cacCau, onLamLaiCauSai, onLamLaiTuDau }) {
  const danhSach = cacCau.map((muc) => muc.cau);
  const cauSai = cacCau.filter((muc) => !muc.kq?.dung);
  const soDung = danhSach.length - cauSai.length;

  // Làm tốt (≥ 80%) thì ăn mừng một lần khi hiện tổng kết
  useEffect(() => {
    if (danhSach.length > 0 && soDung / danhSach.length >= 0.8) {
      banPhaoGiay(null, "lon");
      rungMay("xong");
      phatAm("xong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở tổng kết
  }, []);
  const theoPhan = nhomPhanBaiTap(danhSach).flatMap((nhom) =>
    nhom.cacPhan.map((phan) => {
      const cuaPhan = cacCau.filter((muc) => phanBaiTap(muc.cau).khoa === phan.khoa);
      return { ...phan, nguon: nhom.nguon, dung: cuaPhan.filter((muc) => muc.kq?.dung).length };
    })
  );

  return (
    <section className="kh-tong-ket" aria-labelledby="tong-ket">
      <div className="kh-tong-ket__dau">
        <p id="tong-ket" className="kh-tong-ket__diem">
          <strong>{soDung}</strong>
          <span>/{danhSach.length} câu đúng</span>
        </p>
        <p className="kh-tong-ket__loi-nhan">{loiNhan(soDung / danhSach.length)}</p>
      </div>

      {theoPhan.length > 1 && (
        <ul className="kh-tong-ket__phan">
          {theoPhan.map((phan) => (
            <li key={phan.khoa}>
              <span className="kh-tong-ket__ten-phan">
                <span className="kh-tong-ket__nguon">{phan.nguon}</span> {phan.phan}
              </span>
              <span className="kh-tong-ket__thanh" aria-hidden="true">
                <span style={{ width: `${(phan.dung / phan.soCau) * 100}%` }} />
              </span>
              <span className="kh-tong-ket__so">
                {phan.dung}/{phan.soCau}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="kh-tong-ket__hanh-dong">
        {cauSai.length > 0 && (
          <button type="button" className="ui-button ui-button--primary px-5 py-2.5" onClick={() => onLamLaiCauSai(cauSai.map((muc) => muc.cau))}>
            Làm lại {cauSai.length} câu sai
          </button>
        )}
        <button type="button" className="ui-button ui-button--ghost px-5 py-2.5" onClick={onLamLaiTuDau}>
          Làm lại từ đầu
        </button>
      </div>

      {cauSai.length > 0 && (
        <div className="kh-tong-ket__sai">
          <h4 className="kh-tong-ket__sai-tieu-de">Các câu cần xem lại</h4>
          <ol>
            {cauSai.map(({ cau: c, kq }) => (
              <li key={c.id}>
                <p className="kh-tong-ket__de" lang="en">{c.prompt}</p>
                <p className="kh-tong-ket__so-sanh">
                  <span className="kh-tong-ket__cua-ban">
                    Bạn trả lời: <s lang="en">{traLoiHienThi(c, kq?.traLoi)}</s>
                  </span>
                  <span className="kh-tong-ket__dung">
                    Đúng: <strong lang="en">{layDapAnHienThi(c)}</strong>
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// Lựa chọn ngắn (một từ, cụm ngắn) và số chẵn: màn vừa xếp 2×2 được, câu dài vẫn một cột
const DO_DAI_LUA_CHON_NGAN = 28;
/** Dựng lại lượt làm dở đã lưu; bài đã đổi câu (thiếu câu) hoặc lượt đã xong thì bỏ */
function khoiPhucLuot(luot, cauHoi) {
  // v2: kết quả theo vị trí trong lượt (một câu có thể xuất hiện lại để hỏi lại); bản lưu cũ thì bỏ
  if (!luot || luot.v !== 2 || !Array.isArray(luot.ids) || luot.ids.length === 0) return null;
  const theoId = new Map(cauHoi.map((c) => [c.id, c]));
  const hoiLai = new Set(luot.hoiLai || []);
  const danhSach = luot.ids.map((id, viTri) => {
    const c = theoId.get(id);
    return c && hoiLai.has(viTri) ? { ...c, __hoiLai: true } : c;
  });
  if (danhSach.some((c) => !c)) return null;
  const chiSo = Math.max(0, Number(luot.chiSo) || 0);
  if (chiSo >= danhSach.length) return null;
  const ketQua = Object.fromEntries(Object.entries(luot.ketQua || {}).filter(([viTri]) => Number(viTri) <= chiSo));
  return { phan: luot.phan, danhSach, chiSo, ketQua };
}

/** Câu ở vị trí này đã qua được: trả lời đúng, hoặc sai rồi đã nhập lại đúng */
const daQua = (kq) => Boolean(kq && (kq.dung || kq.daSua));
// Trả lời sai, nhập lại đúng thì câu được hỏi lại sau chừng này câu (giống Tự luận)
const HOI_LAI_SAU = 5;
// Cùng mốc với CSS .kh-bt__khung (KhoaHoc.css): từ đây câu hỏi và phản hồi nằm hai cột
const MOC_HAI_COT = "(min-width: 800px)";

function coLuaChonNgan(options) {
  return options.length % 2 === 0
    && options.every((luaChon) => String(luaChon.text ?? "").length <= DO_DAI_LUA_CHON_NGAN);
}

/**
 * BaiTapKhoaHoc — làm lần lượt từng câu của một buổi trong khoá học riêng.
 * Trả lời xong: đúng/sai + đáp án, gợi ý có sẵn, rồi AI giải thích ngay bên dưới.
 * Mỗi câu trả lời được lưu lên server (tiến độ buổi học); đã làm dở thì mở sẵn phần "Còn lại".
 * Phím tắt: 1–4 hoặc A–D chọn đáp án, Enter sang câu tiếp.
 *
 * ketQuaGanNhat: { [questionId]: đúng/sai lần trả lời gần nhất }; onGhiNhan(questionId, dung) báo lên trang.
 * onTap: ôn câu đến hạn của nhiều buổi (trang Ôn câu bài tập) — làm hết các câu, không chia phần.
 * nguPhap: các mục lý thuyết của buổi ({ title, pattern }) để nhắc công thức ở màn rộng.
 * luotDaLuu / onLuuLuot: lượt đang làm dở lần trước ({ phan, ids, chiSo, ketQua }) — mở lại đúng câu đã dừng;
 *   onLuuLuot(null) khi lượt xong. baoTiepTuc: vừa bấm "Học tiếp" → báo "đang làm tiếp từ câu n". tuDau: người học chọn "Học lại từ đầu" → lượt mới gồm tất cả câu, từ câu 1.
 */
export default function BaiTapKhoaHoc({
  cauHoi,
  ketQuaGanNhat = {},
  onGhiNhan,
  onTap = false,
  luotDaLuu = null,
  tuDau = false,
  baoTiepTuc: coBaoTiepTuc = false,
  onLuuLuot,
  nguPhap = [],
}) {
  // Công thức của buổi (mục có pattern), hiện gập sẵn ở cột kết quả lúc chưa trả lời
  const congThuc = nguPhap.filter((muc) => muc?.pattern && muc?.title);
  const { speak, isPlaying } = useTTS();
  // Lời giải thích đã soạn sẵn giữ trên máy (utils/soanTruocGiaiThich): từ dữ liệu bài (server gửi kèm)
  // và kết quả soạn trước. Trả lời trúng câu đã có thì hiện ngay, không gọi server.
  const khoCua = khoGiaiThichCua;
  // "Tất cả" / "Còn lại" chỉ gồm câu của tài liệu; câu luyện thêm (AI) chọn riêng ở nhóm "Luyện thêm"
  const cauChinh = onTap ? cauHoi : layCauBaiChinh(cauHoi);
  const cauConLai = cauChinh.filter((c) => ketQuaGanNhat[c.id] !== true);
  // Chỉ có ý nghĩa khi đã làm một phần: chưa làm câu nào hoặc sai hết thì "Còn lại" = "Tất cả"
  const coPhanConLai = cauConLai.length > 0 && cauConLai.length < cauChinh.length;
  const [khoiDau] = useState(() => khoiPhucLuot(luotDaLuu, cauHoi));
  const macDinhConLai = coPhanConLai && !tuDau;
  const [phan, setPhan] = useState(khoiDau?.phan ?? (macDinhConLai ? CON_LAI : TAT_CA));
  const [danhSach, setDanhSach] = useState(khoiDau?.danhSach ?? (macDinhConLai ? cauConLai : cauChinh));
  // chiSo: câu đang xem; chiSoXa: câu xa nhất đã tới (mọi câu trước nó đã qua) — lùi xem lại được,
  // tiến chỉ tới chiSoXa
  const [chiSo, setChiSo] = useState(khoiDau?.chiSo ?? 0);
  const [chiSoXa, setChiSoXa] = useState(khoiDau?.chiSo ?? 0);
  // Kết quả theo VỊ TRÍ trong lượt: { [viTri]: { traLoi, dung, nhapLai, daSua, traLoiSua } }
  const [ketQua, setKetQua] = useState(khoiDau?.ketQua ?? {});
  // Lần trả lời vừa xong (âm thanh, pháo giấy, cuộn tới phần kết quả); không chạy khi lùi/tiến xem lại
  const [phanHoi, setPhanHoi] = useState({ lan: 0, dung: false, cuon: false });
  const [loiNhapLai, setLoiNhapLai] = useState("");
  // Đang làm tiếp lượt cũ: báo "từ câu n" kèm nút làm lại từ câu 1
  const [baoTiepTuc, setBaoTiepTuc] = useState(coBaoTiepTuc && Boolean(khoiDau?.chiSo));
  const [giaiThich, setGiaiThich] = useState({});
  // Trạng thái nút Dịch theo câu: { [questionId]: { hien, dangDich, loi } }
  const [banDich, setBanDich] = useState({});
  // Bản dịch có sẵn (server gửi kèm câu hoặc dịch trước trong nền): { [questionId]: { prompt, options } }
  const [dichSan, setDichSan] = useState(() =>
    Object.fromEntries(cauHoi.filter((c) => c.translation?.prompt).map((c) => [c.id, c.translation]))
  );
  // Lượt dịch trước đang chạy: questionId → promise (bấm Dịch lúc đó thì chờ chính lượt này, không gọi lại)
  const dangDichTruocRef = useRef(new Map());
  const hoiLearnBot = useHoiLearnBot();
  const [nhap, setNhap] = useState("");
  const oNhapRef = useRef(null);
  const deBaiRef = useRef(null);
  const cauRef = useRef(null);
  const phanHoiRef = useRef(null);
  // Mỗi lượt làm (Làm lại, đổi phần) một số mới: lời giải thích của lượt cũ đến muộn thì bỏ
  const luotRef = useRef(0);

  useDuaONhapVaoTam(oNhapRef);

  // Đang làm bài trên điện thoại: ẩn nút chat và mèo trang trí ở góc dưới để không che nút trả lời
  useEffect(() => {
    document.documentElement.classList.add("dang-lam-bai");
    return () => document.documentElement.classList.remove("dang-lam-bai");
  }, []);

  const nhomPhan = nhomPhanBaiTap(cauHoi);
  const cau = danhSach[chiSo];
  const daTraLoi = cau ? ketQua[chiSo] : null;
  // Sai và đã bấm "Trả lời lại": đang nhập / chọn lại đáp án đúng
  const dangNhapLai = Boolean(daTraLoi && !daTraLoi.dung && daTraLoi.nhapLai && !daTraLoi.daSua);
  const choTraLoi = !daTraLoi || dangNhapLai;
  const xong = chiSo >= danhSach.length;
  // Đếm đúng/sai theo lần trả lời đầu của từng câu (lượt hỏi lại không tính)
  const cacLanDau = danhSach.map((c, viTri) => ({ cau: c, kq: ketQua[viTri] })).filter((muc) => !muc.cau.__hoiLai);
  const soDung = cacLanDau.filter((muc) => muc.kq?.dung).length;
  const soSai = cacLanDau.filter((muc) => muc.kq && !muc.kq.dung).length;
  const soCauChuaLuu = useSyncExternalStore(theoDoiHangCho, soCauDangCho, () => 0);

  // Ôn câu sai (nhiều buổi): soạn nền mọi câu trong danh sách; ở trang bài học thì TrangBaiHoc đã soạn nền cả buổi
  useEffect(() => {
    napCauHoi(cauHoi);
    if (!onTap) return undefined;
    soanNen(cauHoi.map((c) => c.id));
    return dungSoanNen;
  }, [cauHoi, onTap]);

  // Câu đang hiện + 2 câu kế: soạn ngay (ưu tiên hơn phần nền), lời soạn xong về máy → trả lời xong hiện ngay
  const khoaCauSapToi = danhSach
    .slice(chiSo, chiSo + 3)
    .map((c) => c.id)
    .join(",");
  useEffect(() => {
    uuTienSoan(khoaCauSapToi.split(",").filter(Boolean).map(Number));
  }, [khoaCauSapToi]);

  // Màn một cột: cuộn VỪA ĐỦ để thấy trọn phần kết quả + giải thích phía trên thanh "Câu tiếp theo" dính đáy,
  // nhưng không đẩy đầu phần kết quả khuất dưới header (câu hỏi vẫn còn trong tầm nhìn nếu đủ chỗ).
  // Màn hai cột: phản hồi nằm cạnh câu hỏi, không cuộn.
  function duaPhanHoiVaoTam() {
    const phanHoiEl = phanHoiRef.current;
    if (!phanHoiEl || window.matchMedia?.(MOC_HAI_COT).matches) return;
    const header = document.querySelector(".app-shell-header");
    const dinh =
      header && ["sticky", "fixed"].includes(getComputedStyle(header).position) ? header.getBoundingClientRect().bottom : 0;
    // Thanh "Câu tiếp theo" có thể còn đang trượt lên: lấy chỗ nó sẽ nằm (chiều cao thật), không lấy vị trí lúc trượt
    const thanh = document.querySelector(".ui-thanh-tiep-tuc--co-dinh");
    const day = window.innerHeight - (thanh?.offsetHeight ?? 0);
    // Đo khung bọc (.kh-bt__phai): phần kết quả đang chạy hiệu ứng hiện ra (transform) nên số đo của nó nhỏ hơn thật
    const r = (phanHoiEl.parentElement ?? phanHoiEl).getBoundingClientRect();
    // Khoảng trống cuối phần kết quả chỉ để thanh dính đáy không che chữ: không cần đưa vào tầm nhìn
    const choTrong = phanHoiEl.querySelector(".ui-thanh-tiep-tuc__cho-trong")?.offsetHeight ?? 0;
    const cuon = Math.min(r.bottom - choTrong + 12 - day, r.top - dinh - 12);
    if (cuon <= 4) return;
    const giamChuyenDong = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({ top: cuon, behavior: giamChuyenDong ? "auto" : "smooth" });
  }

  // Phản hồi khi vừa trả lời: đúng thì pháo giấy bắn từ đáp án/ô nhập, sai thì rung
  useEffect(() => {
    if (!phanHoi.lan) return undefined;
    if (phanHoi.dung) {
      banPhaoGiay(cauRef.current?.querySelector(".kh-lua-chon__nut--dung, .kh-dien__o"));
      rungMay("dung");
      phatAm("dung");
    } else {
      rungMay("sai");
      phatAm("sai");
    }
    if (!phanHoi.cuon || window.matchMedia?.(MOC_HAI_COT).matches) return undefined;
    // Lời giải thích hiện / AI viết dần làm phần kết quả dài ra: theo dõi một lúc và cuộn bù,
    // người học tự cuộn / chạm thì thôi
    const phanHoiEl = phanHoiRef.current;
    const khung = requestAnimationFrame(duaPhanHoiVaoTam);
    const theoDoi = typeof ResizeObserver === "function" ? new ResizeObserver(() => duaPhanHoiVaoTam()) : null;
    if (phanHoiEl) theoDoi?.observe(phanHoiEl);
    const thoi = () => {
      theoDoi?.disconnect();
      window.removeEventListener("wheel", thoi);
      window.removeEventListener("touchstart", thoi);
    };
    window.addEventListener("wheel", thoi, { passive: true });
    window.addEventListener("touchstart", thoi, { passive: true });
    const hen = window.setTimeout(thoi, 8000);
    return () => {
      cancelAnimationFrame(khung);
      window.clearTimeout(hen);
      thoi();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi có lần trả lời mới
  }, [phanHoi.lan]);

  // Nhớ lượt đang làm để lần sau mở lại đúng câu (câu xa nhất đã qua thì lần sau mở câu kế)
  useEffect(() => {
    if (!onLuuLuot) return;
    const chiSoLuu = daQua(ketQua[chiSoXa]) ? chiSoXa + 1 : chiSoXa;
    onLuuLuot(
      chiSoLuu >= danhSach.length
        ? null
        : {
            v: 2,
            phan,
            ids: danhSach.map((c) => c.id),
            hoiLai: danhSach.flatMap((c, viTri) => (c.__hoiLai ? [viTri] : [])),
            chiSo: chiSoLuu,
            ketQua,
          }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ lưu khi lượt làm đổi
  }, [phan, danhSach, chiSoXa, ketQua]);

  function batDauLuot(ds) {
    setBaoTiepTuc(false);
    luotRef.current += 1;
    setDanhSach(ds.map((c) => (c.__hoiLai ? { ...c, __hoiLai: undefined } : c)));
    setChiSo(0);
    setChiSoXa(0);
    setLoiNhapLai("");
    setKetQua({});
    setGiaiThich({});
    setNhap("");
  }

  function chonPhan(khoa) {
    if (khoa === CON_LAI && cauConLai.length > 0) {
      setPhan(CON_LAI);
      batDauLuot(cauConLai);
      return;
    }
    // Đã đúng hết phần "Còn lại" thì làm lại toàn bộ
    const khoaMoi = khoa === CON_LAI ? TAT_CA : khoa;
    setPhan(khoaMoi);
    if (khoaMoi === TAT_CA) {
      batDauLuot(cauChinh);
    } else if (khoaMoi.startsWith(TIEN_TO_NHOM)) {
      const nguon = khoaMoi.slice(TIEN_TO_NHOM.length);
      batDauLuot(cauHoi.filter((c) => phanBaiTap(c).nguon === nguon));
    } else {
      batDauLuot(cauHoi.filter((c) => phanBaiTap(c).khoa === khoaMoi));
    }
  }

  function hoiAI(cauHienTai, traLoi) {
    const luot = luotRef.current;
    const datTrangThai = (trangThai) => {
      if (luotRef.current !== luot) return; // đã sang lượt làm khác
      setGiaiThich((cu) => ({ ...cu, [cauHienTai.id]: trangThai }));
    };
    const coSan = timGiaiThichSan(cauHienTai, traLoi, khoCua(cauHienTai));
    if (coSan?.text) {
      datTrangThai({ dangTai: false, text: coSan.text, loi: "", xong: true });
      return;
    }
    const phanSau = coSan?.phanSau || "";
    // Server trả bản đầy đủ (soạn sẵn ở instance khác, hoặc AI viết cả lời) thì không ghép thêm
    const ghep = (text) => ({ dangTai: false, text, loi: "", phanSau: CO_PHAN_DUNG.test(text) ? "" : phanSau });
    datTrangThai({ dangTai: !phanSau, text: "", loi: "", phanSau });
    giaiThichCauHoi(cauHienTai.id, traLoi, {
      chiDongSai: Boolean(phanSau),
      // Chữ hiện dần ngay khi AI viết ra
      onChunk: (text) => datTrangThai(ghep(text)),
    })
      .then((data) => datTrangThai({ ...ghep(data.explanation), xong: true }))
      .catch((error) =>
        datTrangThai({ dangTai: false, text: "", loi: error.message || "AI chưa giải thích được.", phanSau })
      );
  }

  function danhGiaAI(cauHienTai, traLoi, tot) {
    const luot = luotRef.current;
    const sua = (thayDoi) => {
      if (luotRef.current !== luot) return;
      setGiaiThich((cu) => ({ ...cu, [cauHienTai.id]: { ...cu[cauHienTai.id], ...thayDoi } }));
    };
    if (tot) {
      sua({ danhGia: "tot" });
      danhGiaGiaiThich(cauHienTai.id, traLoi, true).catch(() => {});
      return;
    }
    sua({ danhGia: "dang-viet" });
    danhGiaGiaiThich(cauHienTai.id, traLoi, false)
      .then(({ explanation }) => {
        // Server đã ghi đè bản cũ; cập nhật kho trên máy để lần sau gặp lại câu này cũng thấy bản mới
        capNhatGiaiThich(cauHienTai.id, khoaGiaiThich(cauHienTai, traLoi), explanation);
        sua({ text: explanation, phanSau: "", danhGia: "da-viet" });
      })
      .catch(() => sua({ danhGia: "loi" }));
  }

  // Dịch trước trong nền các câu chưa có bản dịch (mỗi câu chỉ dịch một lần, server lưu lại),
  // để trả lời xong bấm "Dịch" là hiện ngay. Chờ một nhịp cho lời giải thích câu đầu được soạn trước.
  const khoaCanDich = cauHoi
    .filter((c) => !c.translation?.prompt)
    .map((c) => c.id)
    .join(",");
  useEffect(() => {
    const ids = khoaCanDich.split(",").filter(Boolean).map(Number);
    if (ids.length === 0) return undefined;
    const hen = window.setTimeout(() => {
      for (let i = 0; i < ids.length; i += 40) {
        const phan = ids.slice(i, i + 40).filter((id) => !dangDichTruocRef.current.has(id));
        if (phan.length === 0) continue;
        const loiHua = layBanDichCauHoi(phan)
          .then((ketQua) => {
            setDichSan((cu) => ({ ...cu, ...ketQua }));
            return ketQua;
          })
          .finally(() => phan.forEach((id) => dangDichTruocRef.current.delete(id)));
        loiHua.catch(() => {}); // lỗi thì lúc bấm "Dịch" hỏi lại riêng câu đó
        phan.forEach((id) => dangDichTruocRef.current.set(id, loiHua));
      }
    }, 1200);
    return () => window.clearTimeout(hen);
  }, [khoaCanDich]);

  // Bấm "Dịch" (sau khi trả lời): hiện bản dịch câu đã điền đáp án + nghĩa từng lựa chọn; bấm lại thì ẩn
  async function bamDich(cauHienTai) {
    const id = cauHienTai.id;
    const sua = (thayDoi) => setBanDich((cu) => ({ ...cu, [id]: { ...cu[id], ...thayDoi } }));
    const daCo = banDich[id];
    if (daCo?.dangDich) return;
    if (dichSan[id]) {
      sua({ hien: !daCo?.hien, loi: "" });
      return;
    }
    sua({ dangDich: true, loi: "" });
    try {
      let ketQua = await dangDichTruocRef.current.get(id)?.catch(() => null);
      if (!ketQua?.[id]) ketQua = await layBanDichCauHoi([id]);
      if (!ketQua?.[id]) throw new Error("Chưa dịch được, thử lại nhé");
      setDichSan((cu) => ({ ...cu, [id]: ketQua[id] }));
      sua({ dangDich: false, hien: true });
    } catch (error) {
      sua({ dangDich: false, loi: error.message || "Chưa dịch được, thử lại nhé" });
    }
  }

  function traLoiCau(traLoi) {
    if (!cau || !traLoi || !choTraLoi) return;
    if (dangNhapLai) {
      nhapLaiCau(traLoi);
      return;
    }
    const dung = laTraLoiDung(cau, traLoi);
    setKetQua((cu) => ({ ...cu, [chiSo]: { traLoi, dung } }));
    setPhanHoi((cu) => ({ lan: cu.lan + 1, dung, cuon: true }));
    onGhiNhan?.(cau.id, dung);
    // Lưu lỗi (mất mạng...) không chặn việc làm bài: câu trả lời vào hàng chờ và tự gửi lại
    luuTraLoiCoHangCho(cau.id, traLoi);
    // Thường đã được soạn trước (hiện ngay); câu tự gõ sai lạ thì AI viết và hiện chữ dần
    hoiAI(cau, traLoi);
  }

  // Sai rồi bấm "Trả lời lại": nhập / chọn lại đáp án đúng (đáp án vẫn hiện để nhìn) mới đi tiếp
  function batDauNhapLai() {
    if (!daTraLoi || daTraLoi.dung || daTraLoi.daSua) return;
    setKetQua((cu) => ({ ...cu, [chiSo]: { ...cu[chiSo], nhapLai: true } }));
    setNhap("");
    setLoiNhapLai("");
  }

  // Lần nhập lại không ghi lên server (đã thấy đáp án); đúng thì câu được hỏi lại sau HOI_LAI_SAU câu
  function nhapLaiCau(traLoi) {
    if (cau.type === "multiple_choice" && traLoi === daTraLoi.traLoi) return;
    if (!laTraLoiDung(cau, traLoi)) {
      setLoiNhapLai("Chưa đúng. Nhìn đáp án rồi trả lời lại nhé.");
      setNhap("");
      setPhanHoi((cu) => ({ lan: cu.lan + 1, dung: false, cuon: false }));
      return;
    }
    setLoiNhapLai("");
    setKetQua((cu) => ({ ...cu, [chiSo]: { ...cu[chiSo], daSua: true, traLoiSua: traLoi } }));
    setDanhSach((cu) => {
      const moi = [...cu];
      moi.splice(Math.min(chiSo + 1 + HOI_LAI_SAU, moi.length), 0, { ...cau, __hoiLai: true });
      return moi;
    });
    setPhanHoi((cu) => ({ lan: cu.lan + 1, dung: true, cuon: false }));
  }

  function denCau(viTri) {
    setNhap("");
    setLoiNhapLai("");
    setChiSo(viTri);
  }

  function sangCauTiep() {
    if (!daQua(ketQua[chiSo])) return;
    setNhap("");
    setLoiNhapLai("");
    setChiSo((cu) => cu + 1);
    setChiSoXa((cu) => Math.max(cu, chiSo + 1));
    // Câu trắc nghiệm tiếp theo: đưa focus về đề bài để bàn phím và trình đọc màn hình theo kịp
    // (câu điền từ thì ô nhập tự focus)
    if (danhSach[chiSo + 1]?.type === "multiple_choice") {
      requestAnimationFrame(() => deBaiRef.current?.focus());
    }
  }

  // Câu nghe có lời thoại (không có file): tự đọc khi sang câu, bấm loa để nghe lại
  const loiThoai = cau && !daTraLoi ? cau.listen_text : null;
  useEffect(() => {
    if (loiThoai) speak(loiThoai, "en-US");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đọc khi sang câu mới
  }, [cau?.id]);

  useEffect(() => {
    function xuLyPhim(event) {
      if (!cau || event.ctrlKey || event.metaKey || event.altKey) return;
      const laONhap = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA";
      // Bỏ qua phím gõ ở ô khác (vd chatbot)
      if (laONhap && event.target !== oNhapRef.current) return;
      if (event.key === "Enter" && daTraLoi && !dangNhapLai) {
        event.preventDefault();
        if (daQua(daTraLoi)) sangCauTiep();
        else batDauNhapLai();
        return;
      }
      // ← / →: xem lại câu trước, quay lại câu đã tới
      if (!laONhap && event.key === "ArrowLeft" && chiSo > 0) {
        denCau(chiSo - 1);
        return;
      }
      if (!laONhap && event.key === "ArrowRight" && chiSo < chiSoXa) {
        denCau(chiSo + 1);
        return;
      }
      if (laONhap || !choTraLoi || cau.type !== "multiple_choice") return;
      const theoSo = cau.options[Number(event.key) - 1];
      const theoChu = cau.options.find((luaChon) => luaChon.key === event.key.toUpperCase());
      const luaChon = theoSo || theoChu;
      if (luaChon) traLoiCau(luaChon.key);
    }
    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  });

  if (cauHoi.length === 0) {
    return <p className="kh-trong">Buổi này chưa có bài tập.</p>;
  }

  const soCauNhom = (nhom) => nhom.cacPhan.reduce((tong, muc) => tong + muc.soCau, 0);
  // Nhóm chứa đúng mọi câu của "Tất cả" thì tab của nó trùng "Tất cả": ẩn tab, phần của nó hiện dưới "Tất cả"
  const nhomTrungTatCa = nhomPhan.find(
    (nhom) => soCauNhom(nhom) === cauChinh.length && cauChinh.every((c) => phanBaiTap(c).nguon === nhom.nguon)
  );
  const tabNhom = nhomPhan.filter((nhom) => nhom !== nhomTrungTatCa);
  // Nhóm đang chọn: chọn cả nhóm, hoặc chọn một phần thuộc nhóm đó
  const nhomDangChon =
    phan === TAT_CA
      ? nhomTrungTatCa
      : nhomPhan.find(
          (nhom) => phan === TIEN_TO_NHOM + nhom.nguon || nhom.cacPhan.some((muc) => muc.khoa === phan)
        );
  const khoaCaNhom = nhomDangChon === nhomTrungTatCa ? TAT_CA : TIEN_TO_NHOM + nhomDangChon?.nguon;

  // Hai tầng: hàng chính chọn nhóm; hàng phụ (chỉ khi nhóm có nhiều phần) chọn một phần trong nhóm
  const boChonPhan = onTap ? null : (
    <div className="kh-bt__loc">
      <div className="ui-filter-tabs ui-filter-tabs--deck kh-bt__nhom-tabs" role="group" aria-label="Chọn nhóm bài tập">
        <button type="button" className="ui-filter-tab" aria-pressed={phan === TAT_CA} onClick={() => chonPhan(TAT_CA)}>
          <span>Tất cả</span>
          <span className="ui-filter-tab__count">{cauChinh.length}</span>
        </button>
        {(coPhanConLai || phan === CON_LAI) && (
          <button type="button" className="ui-filter-tab" aria-pressed={phan === CON_LAI} onClick={() => chonPhan(CON_LAI)}>
            <span>Còn lại</span>
            <span className="ui-filter-tab__count">{cauConLai.length}</span>
          </button>
        )}
        {tabNhom.map((nhom) => (
          <button
            key={nhom.nguon}
            type="button"
            className="ui-filter-tab"
            aria-pressed={nhomDangChon === nhom}
            onClick={() => chonPhan(TIEN_TO_NHOM + nhom.nguon)}
          >
            <span>{nhom.nguon}</span>
            <span className="ui-filter-tab__count">{soCauNhom(nhom)}</span>
          </button>
        ))}
      </div>

      {nhomDangChon && nhomDangChon.cacPhan.length > 1 && (
        <div className="kh-bt__phan" role="group" aria-label={`Chọn phần trong ${nhomDangChon.nguon}`}>
          <button
            type="button"
            className="kh-chip"
            aria-pressed={phan === khoaCaNhom}
            onClick={() => chonPhan(khoaCaNhom)}
          >
            {khoaCaNhom === TAT_CA ? "Tất cả phần" : "Cả nhóm"}
          </button>
          {nhomDangChon.cacPhan.map((muc) => (
            <button
              key={muc.khoa}
              type="button"
              className="kh-chip"
              aria-pressed={phan === muc.khoa}
              onClick={() => chonPhan(muc.khoa)}
            >
              {muc.phan} <span className="kh-chip__so">{muc.soCau}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (xong) {
    return (
      <div className="kh-bt">
        {boChonPhan}
        <TongKet
          cacCau={cacLanDau}
          onLamLaiCauSai={batDauLuot}
          onLamLaiTuDau={() => chonPhan(phan)}
        />
      </div>
    );
  }

  const { nguon, phan: tenPhan } = phanBaiTap(cau);
  const dapAnDung = layDapAnHienThi(cau);
  const soDaLam = danhSach.filter((_, viTri) => daQua(ketQua[viTri])).length;
  const laTracNghiem = cau.type === "multiple_choice";
  const soChoTrong = laTracNghiem ? 0 : demChoTrong(cau.prompt);
  const trangThaiDich = banDich[cau.id];
  const dich = trangThaiDich?.hien ? dichSan[cau.id] : null;
  const hienDich = Boolean(daTraLoi && dich?.prompt);

  return (
    <div className={`kh-bt${onTap ? " kh-bt--on-tap" : ""}`}>
      {boChonPhan}


      <div className="kh-bt__tien-do">
        <div
          className="kh-bt__thanh"
          role="progressbar"
          aria-label="Số câu đã làm"
          aria-valuemin={0}
          aria-valuemax={danhSach.length}
          aria-valuenow={soDaLam}
        >
          <span style={{ width: `${(soDaLam / danhSach.length) * 100}%` }} />
        </div>
        <p className="kh-bt__dem">
          <span className="kh-bt__dieu-huong">
            <button
              type="button"
              className="kh-bt__nut-chuyen"
              onClick={() => denCau(chiSo - 1)}
              disabled={chiSo === 0}
              aria-label="Câu trước"
              title="Câu trước (phím ←)"
            >
              &lsaquo;
            </button>
            <span>
              Câu <strong>{chiSo + 1}</strong> / {danhSach.length}
            </span>
            <button
              type="button"
              className="kh-bt__nut-chuyen"
              onClick={() => denCau(chiSo + 1)}
              disabled={chiSo >= chiSoXa}
              aria-label="Câu sau"
              title="Câu sau (phím →) — chỉ tới câu đã làm"
            >
              &rsaquo;
            </button>
          </span>
          <span className="kh-bt__dem-ket-qua">
            <span className="kh-bt__dem-dung">{soDung} đúng</span>
            <span className="kh-bt__dem-sai">{soSai} sai</span>
          </span>
        </p>
        {soCauChuaLuu > 0 && (
          <p className="kh-bt__chua-luu" role="status">
            Chưa lưu được {soCauChuaLuu} câu vì mất mạng. Ứng dụng sẽ tự gửi lại khi có mạng.
          </p>
        )}
      </div>

      {/* Màn hẹp: một cột. Màn rộng (≥800px: laptop, Fold màn trong xoay ngang): câu hỏi trái, phản hồi phải */}
      <div className="kh-bt__khung">
        <div className="kh-bt__trai">
          {baoTiepTuc && (
            <p className="kh-bt__tiep-tuc" role="status">
              <span>
                Đang làm tiếp từ câu {khoiDau.chiSo + 1}/{danhSach.length} của lần trước.
              </span>
              <button type="button" className="kh-bt__tiep-tuc-nut" onClick={() => batDauLuot(danhSach)}>
                Làm lại từ câu 1
              </button>
            </p>
          )}

          {/* Trình phát nằm ngoài phần đổi theo câu: các câu dùng chung một file nghe giữ nguyên chỗ đang nghe */}
          {cau.audio_key && <NgheAudioCauHoi key={cau.audio_key} cau={cau} />}

          <section key={cau.id} ref={cauRef} className="kh-cau" aria-labelledby="kh-de-bai">
            <p className="kh-cau__phan">
              {cau.lesson_number && <span className="kh-cau__nguon">Buổi {cau.lesson_number} · </span>}
              <span className="kh-cau__nguon">{nguon}</span> {tenPhan}
              {cau.__hoiLai && <span className="kh-cau__hoi-lai">Hỏi lại</span>}
            </p>
            {cau.instruction && <p className="kh-cau__yeu-cau">{cau.instruction}</p>}
            {cau.listen_text && (
              <div className="kh-nghe">
                <button
                  type="button"
                  className="ui-button ui-button--primary kh-nghe__nut"
                  onClick={() => speak(cau.listen_text, "en-US")}
                >
                  {isPlaying ? "Đang đọc..." : "▶ Nghe lại"}
                </button>
              </div>
            )}
            <div className="kh-cau__de">
              <div className="kh-cau__de-noi-dung">
                <p
                  id="kh-de-bai"
                  ref={deBaiRef}
                  tabIndex={-1}
                  className={`kh-cau__de-chu${cau.prompt.length > 90 || cau.prompt.includes("\n") ? " kh-cau__de-chu--dai" : ""}`}
                  lang="en"
                >
                  {cau.prompt}
                </p>
                {hienDich && (
                  <p className="kh-dich kh-dich--de" lang="vi">
                    {dich.prompt}
                  </p>
                )}
                {trangThaiDich?.loi && (
                  <p className="kh-dich kh-dich--loi" role="alert">
                    {trangThaiDich.loi}
                  </p>
                )}
              </div>
              <div className="kh-cau__de-nut">
                <button
                  type="button"
                  className={`kh-nut-loa${isPlaying ? " kh-nut-loa--dang-doc" : ""}`}
                  onClick={() => speak(cau.prompt.replace(/_{2,}/g, " blank "), "en-US")}
                  title="Nghe câu hỏi"
                >
                  <IconLoa />
                  <span className="sr-only">Nghe câu hỏi</span>
                </button>
                {/* Bản dịch là câu đã điền đáp án đúng nên chỉ mở sau khi trả lời */}
                {daTraLoi && (
                  <button
                    type="button"
                    className={`kh-nut-loa${hienDich ? " kh-nut-loa--dang-doc" : ""}`}
                    onClick={() => bamDich(cau)}
                    disabled={Boolean(trangThaiDich?.dangDich)}
                    aria-busy={Boolean(trangThaiDich?.dangDich)}
                    aria-pressed={hienDich}
                    title={trangThaiDich?.dangDich ? "Đang dịch…" : hienDich ? "Ẩn bản dịch" : "Dịch câu sang tiếng Việt"}
                  >
                    <IconDich />
                    <span className="sr-only">
                      {trangThaiDich?.dangDich ? "Đang dịch" : hienDich ? "Ẩn bản dịch" : "Dịch câu sang tiếng Việt"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {laTracNghiem ? (
              <ul className={`kh-lua-chon${coLuaChonNgan(cau.options) ? " kh-lua-chon--ngan" : ""}`}>
                {cau.options.map((luaChon, index) => {
                  // Đang chọn lại: chỉ đánh dấu lựa chọn sai lúc nãy, các lựa chọn khác bấm được
                  const laDung = daTraLoi && !dangNhapLai && luaChon.key === cau.answer_key;
                  const laChonSai = daTraLoi && !daTraLoi.dung && luaChon.key === daTraLoi.traLoi;
                  const trangThai = laDung
                    ? " kh-lua-chon__nut--dung"
                    : laChonSai
                      ? " kh-lua-chon__nut--sai"
                      : daTraLoi && !dangNhapLai
                        ? " kh-lua-chon__nut--mo"
                        : "";
                  return (
                    <li key={luaChon.key}>
                      <button
                        type="button"
                        className={`kh-lua-chon__nut${trangThai}`}
                        onClick={(e) => {
                          // Mọi nút sẽ bị disabled ngay sau khi trả lời: bỏ focus trước để không ép layout cả trang lúc commit
                          e.currentTarget.blur();
                          traLoiCau(luaChon.key);
                        }}
                        disabled={!choTraLoi || laChonSai}
                        aria-keyshortcuts={`${index + 1} ${luaChon.key}`}
                      >
                        <span className="kh-lua-chon__chu" aria-hidden="true">{luaChon.key}</span>
                        <span className="kh-lua-chon__noi-dung">
                          <span lang="en">{luaChon.text}</span>
                          {hienDich && dich.options?.[luaChon.key] && (
                            <span className="kh-dich kh-dich--lua-chon" lang="vi">
                              {dich.options[luaChon.key]}
                            </span>
                          )}
                        </span>
                        {laDung && <IconDung className="kh-lua-chon__icon" />}
                        {laChonSai && <IconSai className="kh-lua-chon__icon" />}
                        {(laDung || laChonSai) && (
                          <span className="sr-only">{laDung ? "(đáp án đúng)" : "(bạn chọn, chưa đúng)"}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <form
                className="kh-dien"
                onSubmit={(event) => {
                  event.preventDefault();
                  traLoiCau(nhap.trim());
                }}
              >
                <label htmlFor="kh-o-nhap" className="sr-only">Câu trả lời</label>
                <input
                  id="kh-o-nhap"
                  key={`${chiSo}-${dangNhapLai}`}
                  ref={oNhapRef}
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={200}
                  value={choTraLoi ? nhap : (daTraLoi.traLoiSua ?? daTraLoi.traLoi)}
                  onChange={(event) => {
                    setNhap(event.target.value);
                    if (loiNhapLai) setLoiNhapLai("");
                  }}
                  disabled={!choTraLoi}
                  placeholder={dangNhapLai ? "Gõ lại đáp án đúng" : soChoTrong >= 2 ? "Từ 1 - Từ 2" : "Nhập đáp án"}
              aria-describedby={soChoTrong >= 2 ? "kh-goi-y-nhieu-cho" : undefined}
                  lang="en"
                  className={`kh-dien__o${
                    choTraLoi ? "" : daQua(daTraLoi) ? " kh-dien__o--dung" : " kh-dien__o--sai"
                  }`}
                />
                <button
                  type="submit"
                  className="ui-button ui-button--primary px-5 py-2.5 whitespace-nowrap"
                  disabled={!choTraLoi || !nhap.trim()}
                >
                  Kiểm tra
                </button>
                {soChoTrong >= 2 && choTraLoi && (
                  <p id="kh-goi-y-nhieu-cho" className="kh-dien__goi-y">
                    {soChoTrong} chỗ trống: gõ lần lượt từng từ, ngăn cách bằng dấu - hoặc dấu phẩy (vd: has - painted)
                  </p>
                )}
              </form>
            )}

            {!daTraLoi && (
              <p className="kh-cau__phim">
                {laTracNghiem
                  ? `Bấm vào đáp án, hoặc phím 1–${cau.options.length}`
                  : "Gõ đáp án rồi nhấn Enter"}
              </p>
            )}
            {dangNhapLai && (
              <p className="kh-cau__nhap-lai" role="status">
                {loiNhapLai || (
                  <>
                    {laTracNghiem ? "Chọn lại" : "Gõ lại"} đáp án đúng để đi tiếp: <strong lang="en">{dapAnDung}</strong>
                  </>
                )}
              </p>
            )}
          </section>
        </div>
        <div className="kh-bt__phai">
          {daTraLoi ? (
            <section
              ref={phanHoiRef}
              className={`kh-phan-hoi ${daTraLoi.dung ? "kh-phan-hoi--dung" : "kh-phan-hoi--sai"}`}
              aria-live="polite"
            >
              <p className="kh-phan-hoi__ket-qua">
                {daTraLoi.dung ? <IconDung className="kh-phan-hoi__icon" /> : <IconSai className="kh-phan-hoi__icon" />}
                {daTraLoi.dung ? "Chính xác" : "Chưa đúng"}
                {!daTraLoi.dung && laTracNghiem && (
                  <span className="kh-phan-hoi__dap-an">
                    Đáp án: <strong lang="en">{dapAnDung}</strong>
                  </span>
                )}
              </p>
              {daTraLoi.daSua && (
                <p className="kh-phan-hoi__goi-y">Bạn đã trả lời lại đúng. Câu này sẽ được hỏi lại sau {HOI_LAI_SAU} câu.</p>
              )}
              {!daTraLoi.dung && !laTracNghiem && (
                <SoSanhChuGo traLoi={daTraLoi.traLoi} dapAnDung={cau.accepted_answers} />
              )}
              {cau.listen_text && (
                <p className="kh-phan-hoi__goi-y" lang="en">
                  Lời thoại: {cau.listen_text}
                </p>
              )}
              {cau.explanation && <p className="kh-phan-hoi__goi-y">{cau.explanation}</p>}
              <GiaiThichAI
                trangThai={giaiThich[cau.id]}
                onThuLai={() => hoiAI(cau, daTraLoi.traLoi)}
                onDanhGia={(tot) => danhGiaAI(cau, daTraLoi.traLoi, tot)}
                onHoiThem={
                  hoiLearnBot &&
                  (() => {
                    const trangThai = giaiThich[cau.id];
                    const text = [trangThai?.text?.trim(), trangThai?.phanSau].filter(Boolean).join("\n");
                    hoiLearnBot(taoCauHoiLearnBot(cau, daTraLoi.traLoi, text));
                  })
                }
              />
              {/* Điện thoại: thanh dính đáy màn hình, nút luôn trong tầm ngón cái; máy tính: nút cuối phần kết quả */}
              {/* Sai: phải trả lời lại đúng mới đi tiếp (giống Tự luận); đang trả lời lại thì ẩn nút */}
              {!dangNhapLai && (
                <div className="kh-phan-hoi__cuoi">
                  <ThanhTiepTuc
                    dung={daTraLoi.dung}
                    onTiepTuc={daQua(daTraLoi) ? sangCauTiep : batDauNhapLai}
                    nhanNut={!daQua(daTraLoi) ? "Trả lời lại" : chiSo + 1 < danhSach.length ? "Câu tiếp theo" : "Xem kết quả"}
                    chiHienKhiCoDinh
                    // Hai cột: nút nằm cuối cột kết quả, không dính đáy che lời giải thích
                    truyVanRong={MOC_HAI_COT}
                  >
                    <span className="ui-thanh-tiep-tuc__nhan">
                      {daTraLoi.dung ? "Chính xác" : daTraLoi.daSua ? "Đã trả lời lại đúng" : "Chưa đúng"}
                    </span>
                    {!daTraLoi.dung && (
                      <span className="ui-thanh-tiep-tuc__dap-an">
                        Đáp án: <strong lang="en">{dapAnDung}</strong>
                      </span>
                    )}
                  </ThanhTiepTuc>
                </div>
              )}
            </section>
          ) : (
            // Màn rộng (2 cột): chỗ của kết quả + lời giải thích, cạnh câu hỏi — trả lời xong là thấy, khỏi cuộn.
            // Trước khi trả lời: việc cần làm + công thức của buổi (gập sẵn, mở khi cần nhắc lại)
            <div className="kh-bt__cho">
              <p className="kh-bt__cho-viec">{laTracNghiem ? "Chọn một đáp án" : "Gõ đáp án rồi nhấn Enter"}</p>
              <p className="kh-bt__cho-mo-ta">Kết quả và lời giải thích sẽ hiện ở đây.</p>
              {congThuc.length > 0 && (
                <details className="kh-bt__cong-thuc">
                  <summary>Xem lại công thức của buổi</summary>
                  <ul>
                    {congThuc.map((muc) => (
                      <li key={muc.title}>
                        <span className="kh-bt__cong-thuc-ten">{muc.title}</span>
                        <code>{muc.pattern}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
