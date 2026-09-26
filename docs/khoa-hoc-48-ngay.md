# Khoá 48 buổi — trích xuất PDF bằng ChatGPT

> Tài liệu gốc có bản quyền, chỉ nhập vào **tài khoản cá nhân** (người khác không xem được).
> File JSON đặt trong `backend/database/private-content/khoa-hoc-48-ngay/` — thư mục đã `.gitignore`, **không commit**.

## Định dạng importer đang đọc (từ bài 13)

Mỗi bài một thư mục, **đặt trên máy, không push lên GitHub**:

```
backend/database/private-content/khoa-hoc-48-ngay/
  bai-13/
    lesson.json      lesson_number, title, vocabulary[{word, part_of_speech, meaning_vi, pronunciation}],
                     grammar[{id, title, pattern, rules[], examples[{en, vi}]}], learning_notes_vi[]
    exercises.json   lesson_number, questions[{id, source, section, type, prompt, options[{key, text}],
                     instruction?, image_description_vi?}]   type: multiple_choice | fill_blank | image_based_fill_blank
    answers.json     lesson_number, answers[{question_id, answer (chữ cái) | accepted_answers[], explanation_vi, provenance}]
```

47 bài còn lại cứ giữ **đúng định dạng của bài 13** (cùng prompt đã tạo ra bài 13). Kiểm tra rồi nhập (trong `backend/`):

```
npm run nhap:khoa-hoc
npm run nhap:khoa-hoc -- --email=<email đăng nhập> --apply
```

> Prompt bên dưới là bản đề xuất ban đầu, xuất ra định dạng **khác** (`buoi-XX.json`) — importer chưa đọc định dạng đó.

## Kết quả cần có (bản đề xuất ban đầu)

Mỗi buổi 2 file (XX = 01…48), tổng 96 file:

| File | Nội dung | Dùng cho |
|---|---|---|
| `buoi-XX.json` | lý thuyết, từ vựng, bài tập gốc + đáp án (từ file đáp án) | trang Lý thuyết, bộ từ theo buổi, bài tập gốc |
| `bai-tap-them-XX.json` | 40–50 câu trắc nghiệm mới + giải thích | chức năng Bài tập |

## Cách làm

1. **Chuẩn bị tài liệu.** ChatGPT thường không mở được link Google Drive dạng chia sẻ. Trên Drive, chuột phải thư mục bài học → *Tải xuống* (ra file ZIP), làm tương tự với thư mục đáp án. Nếu ChatGPT của bạn đã kết nối Google Drive thì có thể đính kèm thẳng từ Drive.
2. **Mở ChatGPT** bằng model có công cụ chạy Python / phân tích dữ liệu (bản Plus trở lên). Nên tạo một *Project* riêng.
3. **Dán toàn bộ prompt** ở mục dưới, đính kèm 2 file ZIP, gửi.
4. ChatGPT làm **1 buổi mỗi lượt**, đưa link tải 2 file. Gõ `tiếp` để sang buổi sau. Cứ 8 buổi nó gửi thêm 1 file ZIP gộp — tải về ngay (file trong ChatGPT có thể hết hạn).
5. Chat quá dài hoặc lỗi: mở chat mới, dán lại prompt + 2 ZIP, thêm dòng `Bắt đầu từ buổi X`.
6. **Làm thử buổi 1–2 trước**, gửi mình 4 file đó để kiểm tra định dạng, rồi mới làm tiếp.
7. Xong hết: chép 96 file vào `backend/database/private-content/khoa-hoc-48-ngay/`, báo mình. Mình chạy script kiểm tra rồi mới nhập vào DB.

## Prompt (copy toàn bộ khối dưới)

````text
VAI TRÒ
Bạn là chuyên gia biên soạn học liệu tiếng Anh cho người Việt mất gốc (A1 → B1), kiêm kỹ sư dữ liệu. Nhiệm vụ: chuyển tài liệu PDF của một khoá học 48 buổi (tôi đã mua, chỉ dùng để tự học) thành dữ liệu JSON để nhập vào ứng dụng học cá nhân của tôi.

ĐẦU VÀO
- Bộ 1: 48 file PDF bài học, mỗi file là 1 buổi (tên file có số bài, vd "Bài 1-....pdf").
- Bộ 2: 48 file đáp án tương ứng.
- Tôi gửi dạng ZIP hoặc đính kèm từ Google Drive. Dùng Python để giải nén và đọc.
- PDF có thể bị mã hoá với mật khẩu mở để trống: dùng pypdf và gọi reader.decrypt("") trước khi đọc (hoặc pdfplumber / pymupdf). Trang nào không có chữ (ảnh scan) thì đọc bằng hình ảnh / OCR.

ĐẦU RA — mỗi buổi 2 file JSON (UTF-8, không BOM), lưu ở /mnt/data/khoa-hoc-48-ngay/ (XX = 01..48, luôn 2 chữ số):
1. buoi-XX.json — lý thuyết + từ vựng + bài tập gốc kèm đáp án (SCHEMA 1)
2. bai-tap-them-XX.json — 40–50 câu trắc nghiệm mới cho buổi đó (SCHEMA 2)

QUY TRÌNH
Bước 0 (chỉ lần đầu): in bảng ghép "số buổi | file bài học | file đáp án". Báo file thiếu hoặc không khớp. Sau đó làm buổi 1 (hoặc buổi tôi chỉ định bằng câu "Bắt đầu từ buổi X").
Mỗi lượt trả lời CHỈ LÀM 1 BUỔI:
  a. Đọc toàn văn PDF bài học và file đáp án của buổi đó (mọi trang).
  b. Tạo buoi-XX.json theo SCHEMA 1 và QUY TẮC TRÍCH XUẤT.
  c. Tạo bai-tap-them-XX.json theo SCHEMA 2 và QUY TẮC BÀI TẬP THÊM.
  d. Chạy Python theo mục TỰ KIỂM TRA, sửa đến khi đạt.
  e. Trả lời NGẮN, KHÔNG dán JSON vào chat: link tải 2 file + 1 dòng thống kê (số từ vựng, số mục lý thuyết, số câu bài tập gốc, trong đó bao nhiêu câu đáp án lấy từ file đáp án / AI tự giải, số câu bài tập thêm) + cảnh báo nếu có. Kết thúc bằng: "Gõ 'tiếp' để làm buổi <số tiếp theo>".
Sau buổi 8, 16, 24, 32, 40, 48: tạo thêm khoa-hoc-48-ngay-den-buoi-XX.zip chứa TẤT CẢ file đã làm từ trước đến giờ.

QUY TẮC TRÍCH XUẤT (buoi-XX.json)
1. Trung thành với tài liệu: giữ nguyên lý thuyết, ví dụ, bảng, lưu ý. Chỉ sửa lỗi chính tả hiển nhiên. Không thêm kiến thức ngoài tài liệu vào ly_thuyet.
2. Bỏ các dòng lặp ở đầu/cuối trang (tên khoá, tên giáo viên, website, câu nhắc không chia sẻ, số trang).
3. Từ vựng: lấy TẤT CẢ từ / cụm từ trong phần từ vựng (VOCABULARY) và các bảng phát âm (PRONUNCIATION). Mỗi từ một mục, gộp phiên âm vào đúng từ đó; giữ tên nhóm của tài liệu ở trường nhom. Từ nhiều nghĩa: ghi trong một chuỗi, ngăn bằng dấu phẩy (vd "anh trai, em trai").
   - vi_du: nếu tài liệu có câu ví dụ cho từ đó thì dùng (vi_du_nguon = "tai_lieu"). Nếu không, tự viết 1 câu ngắn (không quá 10 từ), chỉ dùng ngữ pháp đã học tới buổi này (vi_du_nguon = "ai").
   - vi_du BẮT BUỘC chứa nguyên văn chữ ở trường tu, đúng chính tả, không biến đổi (tu = "child" thì câu phải có "child", không dùng "children").
4. Lý thuyết: mỗi mục lớn của phần ngữ pháp (GRAMMAR 1., 2., 3. ...) là một phần tử. noi_dung_md viết Markdown: tiêu đề con dùng ###, gạch đầu dòng, **in đậm** ý chính, bảng dùng cú pháp bảng Markdown (| a | b |), câu ví dụ giữ nguyên kèm nghĩa trong ngoặc. Không dùng HTML. Hình ảnh: thay bằng dòng "> [Hình: mô tả ngắn]" và ghi vào ghi_chu.
   - KHÔNG chép phần từ vựng / phát âm vào ly_thuyet (đã nằm ở tu_vung, ứng dụng tự hiện bảng từ).
5. Bài tập gốc: lấy MỌI bài tập (Quiz giữa bài, Practice, Exercise ...) theo đúng thứ tự. Mỗi câu thành 1 câu trắc nghiệm:
   - Câu vốn là trắc nghiệm: giữ nguyên số lựa chọn (2–4) và nội dung lựa chọn.
   - Câu khoanh chọn giữa các từ (vd "a/ an ..."): lựa chọn chính là các từ đó.
   - Câu điền từ, viết lại, dịch ...: de_bai là yêu cầu rõ ràng; đáp án đúng lấy từ file đáp án; tự thêm lựa chọn nhiễu cho đủ 4; giữ câu gốc ở cau_goc và đáp án gốc ở dap_an_goc.
   - Đáp án LẤY TỪ FILE ĐÁP ÁN, ghép theo đúng tên bài tập và số câu → nguon_dap_an = "file_dap_an". Chỉ khi file đáp án không có câu đó mới tự giải → nguon_dap_an = "ai", và ghi vào ghi_chu. File đáp án có lời giải thích thì đưa vào giai_thich.
   - sau_muc: mã mục lý thuyết mà bài tập nằm ngay sau (Quiz giữa bài). Bài tập cuối buổi để null.
6. Chỗ trống trong câu luôn viết đúng 5 dấu gạch dưới: _____

QUY TẮC BÀI TẬP THÊM (bai-tap-them-XX.json)
1. 40–50 câu MỚI, không trùng câu gốc, không trùng nhau.
2. Chỉ dùng kiến thức của buổi hiện tại và các buổi trước, không dùng ngữ pháp / từ vựng của buổi sau. Ưu tiên từ vựng của buổi hiện tại.
3. Phân bổ: khoảng 60% ngữ pháp trọng tâm của buổi, 25% từ vựng của buổi, 15% ôn các buổi trước (buổi 1 thì chia vào 2 nhóm đầu). Độ khó: khoảng 40% dễ, 40% vừa, 20% khó.
4. Đa dạng dạng câu (trường dang): dien_cho_trong, chon_cau_dung, tim_loi_sai, dich_viet_anh, dich_anh_viet, sap_xep_cau, nghia_tu, phat_am. Dùng các dạng phù hợp với nội dung buổi.
5. Mỗi câu đúng 4 lựa chọn, 1 đáp án đúng duy nhất, không mơ hồ. Lựa chọn nhiễu hợp lý, dựa trên lỗi người Việt hay mắc; độ dài các lựa chọn tương đương; không dùng "tất cả đều đúng / đều sai". Vị trí đáp án đúng rải đều A/B/C/D.
6. giai_thich: 1–3 câu tiếng Việt dễ hiểu cho người mất gốc: vì sao đáp án đúng, và nếu cần, vì sao lựa chọn nhiễu dễ chọn nhầm nhất lại sai.
7. Câu dịch: đưa câu nguồn vào de_bai, vd "Dịch sang tiếng Anh: Tôi có hai cuốn sách."

GIÁ TRỊ HỢP LỆ
- loai_tu: noun | verb | adjective | adverb | pronoun | determiner | preposition | conjunction | phrase | other
- dap_an: "A" | "B" | "C" | "D" (theo thứ tự trong lua_chon)
- nguon_dap_an: "file_dap_an" | "ai"
- vi_du_nguon: "tai_lieu" | "ai"
- do_kho: "de" | "vua" | "kho"
- ma: duy nhất trong file. Bài tập gốc: "<ma bài>-<số câu>" (vd "quiz-1-3", "practice-10"). Bài tập thêm: "them-XX-001" ... Làm lại một buổi thì giữ nguyên mã.
- Tiếng Việt có dấu đầy đủ; tiếng Anh tự nhiên, đúng ngữ pháp.

SCHEMA 1 — buoi-XX.json (ví dụ minh hoạ định dạng, nội dung là giả định)
{
  "schema": "khoa-hoc-48/buoi@1",
  "buoi": 1,
  "tieu_de": "Tên bài bằng tiếng Việt có dấu",
  "tieu_de_goc": "UNIT 1: ...",
  "muc_tieu": ["Ý chính 1 của buổi", "Ý chính 2 của buổi"],
  "tu_vung": [
    {
      "nhom": "Danh từ chỉ nghề nghiệp",
      "tu": "doctor",
      "phien_am": "/ˈdɒktə(r)/",
      "loai_tu": "noun",
      "nghia": "bác sĩ",
      "vi_du": "My uncle is a doctor.",
      "vi_du_nghia": "Chú tôi là bác sĩ.",
      "vi_du_nguon": "ai",
      "ghi_chu": ""
    }
  ],
  "ly_thuyet": [
    {
      "ma": "lt-1",
      "tieu_de": "1. Danh từ số nhiều",
      "noi_dung_md": "Thêm **-s** vào sau danh từ đếm được để chỉ số nhiều.\n\n| Số ít | Số nhiều |\n|---|---|\n| a book | books |\n\nVí dụ: two books (hai cuốn sách)"
    }
  ],
  "bai_tap_goc": [
    {
      "ma": "quiz-1",
      "tieu_de": "Quiz 1",
      "yeu_cau": "Yêu cầu của bài tập, đúng như tài liệu",
      "sau_muc": "lt-1",
      "cau_hoi": [
        {
          "ma": "quiz-1-1",
          "cau_goc": "Câu hỏi đúng như trong tài liệu",
          "dap_an_goc": "Đáp án đúng như trong file đáp án",
          "de_bai": "I have two _____.",
          "lua_chon": ["books", "book", "a books", "bookes"],
          "dap_an": "A",
          "nguon_dap_an": "file_dap_an",
          "chu_diem": "danh từ số nhiều",
          "giai_thich": ""
        }
      ]
    }
  ],
  "ghi_chu": []
}

SCHEMA 2 — bai-tap-them-XX.json (ví dụ minh hoạ định dạng)
{
  "schema": "khoa-hoc-48/bai-tap-them@1",
  "buoi": 1,
  "cau_hoi": [
    {
      "ma": "them-01-001",
      "dang": "dien_cho_trong",
      "do_kho": "de",
      "chu_diem": "danh từ số nhiều",
      "de_bai": "She has three _____.",
      "lua_chon": ["cat", "a cat", "cats", "cates"],
      "dap_an": "C",
      "giai_thich": "Sau \"three\" (ba) danh từ phải ở dạng số nhiều nên thêm -s: cats."
    }
  ]
}

TỰ KIỂM TRA (chạy bằng Python trước khi đưa link)
- json.load đọc được; tên file và trường buoi đúng số buổi; schema đúng chuỗi ở trên.
- Mọi trường bắt buộc có mặt và không rỗng (ghi_chu, giai_thich của bài tập gốc, dap_an_goc được phép rỗng).
- lua_chon: 2–4 phần tử với bài tập gốc, đúng 4 với bài tập thêm; không trùng nhau; dap_an trỏ tới một lựa chọn có thật.
- Câu dang = "dien_cho_trong" có đúng một "_____".
- Mỗi vi_du chứa nguyên văn tu (không phân biệt hoa thường).
- Bài tập thêm: 40–50 câu; ma không trùng; de_bai không trùng; mỗi chữ A/B/C/D chiếm không quá 35% số đáp án.
- Có lỗi thì sửa rồi kiểm tra lại. KHÔNG bỏ bớt nội dung để qua kiểm tra.

Bắt đầu với Bước 0.
````

## Sau khi có file (phần mình làm)

1. Script kiểm tra 96 file (đúng schema, đáp án hợp lệ, câu trùng, câu đáp án do AI tự giải cần xem lại).
2. Migration: khoá học, buổi học, câu hỏi, kết quả làm bài, bộ đệm giải thích AI — tất cả gắn `user_id` của bạn.
3. Script nhập (chạy lại an toàn): mỗi buổi tạo 1 bộ từ riêng của bạn → học được bằng mọi chế độ hiện có + SRS.
4. Giao diện: trang khoá học (48 buổi + tiến độ) → trang buổi học: Lý thuyết · Từ vựng · Bài tập.
5. Bài tập: trả lời xong mỗi câu, AI (Gemini) giải thích ngay bên dưới, dựa trên đề, đáp án và `giai_thich` có sẵn; lời giải thích được lưu lại để lần sau không gọi AI nữa.
