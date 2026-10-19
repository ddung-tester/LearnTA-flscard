import { describe, expect, it } from "vitest";
import {
  taoCauHoiLearnBot,
  tachPhanDungCuaGiaiThich,
  timGiaiThichSan,
  chiaDongBuoi,
  chuanHoaTraLoi,
  laTraLoiDung,
  layCauBaiChinh,
  layDapAnHienThi,
  tachChuDam,
  tachCongThuc,
  tongSoBuoiKhoaHoc,
  tienDoBuoiHoc,
  timBuoiTiepTheo,
  tongHopKhoaHoc,
  nhomPhanBaiTap,
  phanBaiTap,
} from "./baiTapKhoaHoc";

const TRAC_NGHIEM = {
  type: "multiple_choice",
  source: "lesson",
  section: "quiz_2",
  options: [
    { key: "A", text: "is" },
    { key: "B", text: "are" },
  ],
  answer_key: "A",
};
const DIEN_TU = {
  type: "fill_blank",
  source: "exam",
  section: "fill_verbs",
  accepted_answers: ["did not pay", "didn’t pay"],
};

describe("chấm bài tập khoá học", () => {
  it("normalizes case, spaces, final punctuation and curly quotes", () => {
    expect(chuanHoaTraLoi("  Didn’t   PAY. ")).toBe("didn't pay");
  });

  it("checks the option letter for multiple choice", () => {
    expect(laTraLoiDung(TRAC_NGHIEM, "a")).toBe(true);
    expect(laTraLoiDung(TRAC_NGHIEM, "B")).toBe(false);
  });

  it("accepts any accepted spelling for fill-in, including a straight apostrophe", () => {
    expect(laTraLoiDung(DIEN_TU, "didn't pay")).toBe(true);
    expect(laTraLoiDung(DIEN_TU, "Did not pay!")).toBe(true);
    expect(laTraLoiDung(DIEN_TU, "not pay")).toBe(false);
    expect(laTraLoiDung(DIEN_TU, "   ")).toBe(false);
  });

  it("shows the correct answer text", () => {
    expect(layDapAnHienThi(TRAC_NGHIEM)).toBe("is");
    expect(layDapAnHienThi(DIEN_TU)).toBe("did not pay / didn’t pay");
  });
});

describe("tongSoBuoiKhoaHoc", () => {
  it("reads the lesson count from the course name, never below the lessons that exist", () => {
    expect(tongSoBuoiKhoaHoc("Khoá 48 ngày lấy gốc tiếng Anh", 13)).toBe(48);
    expect(tongSoBuoiKhoaHoc("Khoá ngữ pháp", 13)).toBe(13);
    expect(tongSoBuoiKhoaHoc("Khoá 10 buổi", 12)).toBe(12);
  });
});

describe("tachCongThuc", () => {
  it("marks learner slots and fixed words", () => {
    expect(tachCongThuc("S + did not (didn’t) + V nguyên mẫu + ...")).toEqual([
      { text: "S", laCho: true },
      { text: "did not (didn’t)", laCho: false },
      { text: "V nguyên mẫu", laCho: true },
      { text: "...", laCho: true },
    ]);
    expect(tachCongThuc("Was/Were + S + ...?").map((k) => k.laCho)).toEqual([false, true, true]);
    expect(tachCongThuc("She/He + V2/V-ed").map((k) => k.laCho)).toEqual([false, true]);
    expect(tachCongThuc("")).toEqual([]);
  });
});

describe("hiển thị", () => {
  it("names exercise sections and groups them by source", () => {
    expect(phanBaiTap(TRAC_NGHIEM)).toEqual({ khoa: "lesson/quiz_2", nguon: "Trong bài", phan: "Quiz 2" });
    expect(phanBaiTap(DIEN_TU).phan).toBe("Điền động từ");
    expect(phanBaiTap({ source: "khac", section: "new_part" })).toEqual({
      khoa: "khac/new_part",
      nguon: "Khác",
      phan: "new part",
    });
    expect(nhomPhanBaiTap([TRAC_NGHIEM, DIEN_TU, TRAC_NGHIEM])).toEqual([
      { nguon: "Trong bài", cacPhan: [{ khoa: "lesson/quiz_2", phan: "Quiz 2", soCau: 2 }] },
      { nguon: "Bài thi", cacPhan: [{ khoa: "exam/fill_verbs", phan: "Điền động từ", soCau: 1 }] },
    ]);
  });

  it("splits **bold** segments without HTML", () => {
    expect(tachChuDam("Dùng **was** với I.")).toEqual([
      { text: "Dùng ", dam: false },
      { text: "was", dam: true },
      { text: " với I.", dam: false },
    ]);
    expect(tachChuDam("<b>x</b>")).toEqual([{ text: "<b>x</b>", dam: false }]);
    expect(tachChuDam("chủ ngữ số nhiều (*You, We*) dùng **were**")).toEqual([
      { text: "chủ ngữ số nhiều (You, We) dùng ", dam: false },
      { text: "were", dam: true },
    ]);
  });
});

describe("tiến độ khoá học", () => {
  const buoi = (lesson_number, tienDo = {}) => ({
    lesson_number,
    word_count: 10,
    question_count: 20,
    learned_count: 0,
    answered_count: 0,
    correct_count: 0,
    ...tienDo,
  });
  const XONG = { learned_count: 10, answered_count: 20, correct_count: 20 };

  it("tính phần trăm trên cả từ vựng và bài tập, xong khi đủ hết", () => {
    expect(tienDoBuoiHoc(buoi(1))).toMatchObject({ phanTram: 0, daBatDau: false, xong: false });
    expect(tienDoBuoiHoc(buoi(1, { learned_count: 5, answered_count: 12, correct_count: 10 }))).toMatchObject({
      tuDaHoc: 5,
      cauDung: 10,
      phanTram: 50,
      daBatDau: true,
      xong: false,
    });
    expect(tienDoBuoiHoc(buoi(1, XONG))).toMatchObject({ phanTram: 100, xong: true });
    // Làm sai hết vẫn tính là đã bắt đầu
    expect(tienDoBuoiHoc(buoi(1, { answered_count: 3 })).daBatDau).toBe(true);
    // Buổi chưa có từ lẫn câu hỏi không bao giờ "xong"
    expect(tienDoBuoiHoc(buoi(1, { word_count: 0, question_count: 0 })).xong).toBe(false);
  });

  it("cộng dồn tiến độ cả khoá, kể cả số câu cần ôn", () => {
    expect(
      tongHopKhoaHoc({
        lessons: [
          buoi(12, { ...XONG, mastered_count: 4, due_count: 0 }),
          buoi(13, { learned_count: 3, mastered_count: 1, answered_count: 8, correct_count: 6, due_count: 2 }),
        ],
      })
    ).toEqual({ soBuoi: 2, soBuoiXong: 1, tuDaHoc: 13, tongTu: 20, tuDaThuoc: 5, cauDung: 26, tongCau: 40, cauCanOn: 2 });
    expect(tongHopKhoaHoc({ lessons: [] }).soBuoi).toBe(0);
  });

  it("chọn buổi học tiếp theo từ chỗ đang học dở", () => {
    expect(timBuoiTiepTheo([buoi(14), buoi(13)]).lesson_number).toBe(13);
    // Đang học dở buổi 14 thì tiếp tục buổi 14, kể cả khi buổi 13 còn câu sai
    expect(timBuoiTiepTheo([buoi(13, { learned_count: 10 }), buoi(14, { answered_count: 1 }), buoi(15)]).lesson_number).toBe(14);
    expect(timBuoiTiepTheo([buoi(13, XONG), buoi(14)]).lesson_number).toBe(14);
    expect(timBuoiTiepTheo([buoi(13, XONG)])).toBeNull();
    expect(timBuoiTiepTheo([])).toBeNull();
  });
});

describe("layCauBaiChinh", () => {
  it("bỏ câu luyện thêm, trừ khi buổi chỉ có câu luyện thêm", () => {
    const trongBai = { id: 1, source: "lesson" };
    const luyenThem = { id: 2, source: "extra" };
    expect(layCauBaiChinh([trongBai, luyenThem])).toEqual([trongBai]);
    expect(layCauBaiChinh([luyenThem])).toEqual([luyenThem]);
  });
});

describe("chiaDongBuoi", () => {
  it("keeps every lesson with content on its own row and merges runs of empty lessons", () => {
    const theoSo = new Map([
      [3, { lesson_number: 3, deck_id: 30 }],
      [4, { lesson_number: 4, deck_id: 40 }],
      [6, { lesson_number: 6, deck_id: null }],
    ]);

    const dong = chiaDongBuoi(theoSo, 8).map(({ bai, tu, den }) => [bai ? bai.lesson_number : null, tu, den]);

    // Buổi chưa có bộ từ (deck_id null) cũng tính là trống
    expect(dong).toEqual([
      [null, 1, 2],
      [3, 3, 3],
      [4, 4, 4],
      [null, 5, 8],
    ]);
  });
});

describe("phanTichLoiGo", () => {
  it("nhận ra lỗi chính tả nhỏ và tô đúng ký tự sai/thiếu", async () => {
    const { phanTichLoiGo } = await import("./baiTapKhoaHoc");
    const kq = phanTichLoiGo("recieve", ["receive"]);
    expect(kq.loai).toBe("chinh-ta");
    expect(kq.dapAn).toBe("receive");
    // đoạn đã gõ: phần sai được đánh dấu; ghép lại vẫn ra đúng chữ đã gõ
    expect(kq.doanDaGo.map((d) => d.text).join("")).toBe("recieve");
    expect(kq.doanDaGo.some((d) => d.kieu === "sai")).toBe(true);
    expect(kq.doanDapAn.map((d) => d.text).join("")).toBe("receive");
    expect(kq.doanDapAn.some((d) => d.kieu === "thieu")).toBe(true);
  });

  it("nhận ra sai đuôi -s/-ed/-ing", async () => {
    const { phanTichLoiGo } = await import("./baiTapKhoaHoc");
    expect(phanTichLoiGo("She go to school", ["She goes to school"]).loai).toBe("duoi-tu");
    expect(phanTichLoiGo("watched", ["watching"]).loai).toBe("duoi-tu");
    expect(phanTichLoiGo("play", ["played"]).loai).toBe("duoi-tu");
  });

  it("nhận ra thiếu hoặc thừa từ", async () => {
    const { phanTichLoiGo } = await import("./baiTapKhoaHoc");
    expect(phanTichLoiGo("I going", ["I am going"])).toMatchObject({ loai: "thieu-tu", tuLech: ["am"] });
    expect(phanTichLoiGo("did went", ["went"])).toMatchObject({ loai: "thua-tu", tuLech: ["did"] });
  });

  it("chọn đáp án gần nhất khi có nhiều đáp án đúng; khác hẳn thì loai = khac", async () => {
    const { phanTichLoiGo } = await import("./baiTapKhoaHoc");
    expect(phanTichLoiGo("dont", ["do not", "don't"]).dapAn).toBe("don't");
    expect(phanTichLoiGo("banana", ["went"]).loai).toBe("khac");
  });
});


describe("lời giải thích có sẵn trên máy", () => {
  const tracNghiem = { type: "multiple_choice", answer_key: "A", options: [{ key: "A" }, { key: "B" }] };
  const dienTu = { type: "fill_blank", accepted_answers: ["was"] };
  const kho = {
    A: "Đúng rồi: …",
    B: "Sai vì: …",
    was: "Đúng rồi: **was** đi với số ít.\nNhớ: he + **was**",
    "were ": "không dùng",
    weres: "Sai vì: thừa s",
  };

  it("trắc nghiệm và câu gõ đã soạn sẵn hiện ngay", () => {
    expect(timGiaiThichSan(tracNghiem, "b", kho)).toEqual({ text: "Sai vì: …" });
    expect(timGiaiThichSan(dienTu, " Weres. ", kho)).toEqual({ text: "Sai vì: thừa s" });
    expect(timGiaiThichSan(dienTu, "WAS", kho)).toEqual({ text: kho.was });
  });

  it("câu gõ sai kiểu mới: dùng lại phần đáp án đúng, chỉ chờ dòng Sai vì", () => {
    expect(timGiaiThichSan(dienTu, "is", kho)).toEqual({ phanSau: "Đúng vì: **was** đi với số ít.\nNhớ: he + **was**" });
    expect(timGiaiThichSan(dienTu, "is", {})).toBeNull();
    expect(timGiaiThichSan(tracNghiem, "A", {})).toBeNull();
  });

  it("tách phần đáp án đúng giống backend", () => {
    expect(tachPhanDungCuaGiaiThich("**Đúng rồi**: vì x\nNhớ: y")).toBe("Đúng vì: vì x\nNhớ: y");
    expect(tachPhanDungCuaGiaiThich("Sai vì: x\nNhớ: y")).toBeNull();
  });
});

describe("taoCauHoiLearnBot", () => {
  const cau = {
    type: "multiple_choice",
    prompt: "She ___ to school.",
    options: [
      { key: "A", text: "go" },
      { key: "B", text: "goes" },
    ],
    answer_key: "B",
  };

  it("kèm đề, lựa chọn, câu trả lời, đáp án đúng và lời giải thích", () => {
    const tin = taoCauHoiLearnBot(cau, "A", "Sai vì: go đi với I/you.");
    expect(tin).toContain("She ___ to school.");
    expect(tin).toContain("A. go / B. goes");
    expect(tin).toContain("Mình trả lời: A. go (sai). Đáp án đúng: goes.");
    expect(tin).toContain("Sai vì: go đi với I/you.");
  });

  it("không vượt giới hạn 2000 ký tự của LearnBot", () => {
    const dai = "x".repeat(5000);
    const tin = taoCauHoiLearnBot({ type: "fill_blank", prompt: dai, accepted_answers: ["went"] }, "go", dai);
    expect(tin.length).toBeLessThanOrEqual(2000);
    expect(tin).toContain("Đáp án đúng: went.");
  });
});
