# PROJECT_CONTEXT.md

> Cap nhat: 2026-09-27. File nay mo ta trang thai THAT cua code tren `main`.
> Khi code thay doi lon (route, bang DB, luong auth), cap nhat lai file nay.

> **AI/dev moi vao du an: doc `HANDOFF.md` truoc** (da lam gi, chua lam gi, deploy, plan tiep theo).

## 1. Ten du an

**LearnTA / Streak Drop** — ung dung web hoc tu vung tieng Anh cho nguoi Viet.

- **Khoa hoc**: lo trinh tu vung cong khai (3 lo trinh x 4 chang) + khoa hoc RIENG cua chu tai khoan (khoa 48 buoi: tu vung, ly thuyet, bai tap co AI giai thich, luyen them, on cau sai theo SRS).
- **Bo tu**: nguoi dung tu tao bo tu, them cap tu Anh - Viet (tay, dan danh sach, AI tao).
- **Luyen tap / On tap**: flashcard, trac nghiem, tu luan, nghe viet, ngu canh, noi tu, hon hop; on tap theo lich SRS; so tu sai; thong ke; streak; chatbot AI (LearnBot).

- Frontend: https://dungdinh-vocab.vercel.app (Vercel)
- Backend: Google Cloud Run (service `flashcard-backend`)
- Database: Google Cloud SQL (MySQL 8)

---

## 2. Trang thai hien tai

```txt
Status: Dang chay production (nguoi dung chinh la chu du an)
Frontend: React/Vite, goi API that qua services/*; con mock data lam fallback khi API loi
Backend: Express 5 + MySQL, CRUD, auth JWT + Google, SRS, mistakes, stats, email, chatbot, lo trinh, khoa hoc rieng
Tests: node:test (backend, 67) + vitest (frontend, 88), chay tren GitHub Actions cung lint + build
Deploy: push main -> Vercel (FE) + Cloud Build -> Cloud Run (BE); migration chay tay
```

### Viec con ton dong

- `TrangChiTietBo.jsx` (~1760 dong), `TrangTuLuan.jsx` (~1450), `TrangOnTapHomNay.jsx` (~920) van lon.
- Frontend lint: 0 loi; `react-hooks/set-state-in-effect` ha thanh canh bao (`eslint.config.js`, con 14 cho vi pham) + 8 canh bao `exhaustive-deps`. CI chan khi co loi lint.
- Video reward (~70 MB) nam trong `frontend/public/media/milestones/` va lich su git (nguoi dung chon de nguyen).
- Khoa 48 buoi moi co bai 13; 47 bai con lai cho nguoi dung trich tu PDF (xem HANDOFF muc 4.1).

---

## 3. Tech stack

### Frontend (`frontend/`)

- React 19, Vite 8, JavaScript, React Router DOM 7
- Tailwind CSS 4 + design tokens trong `index.css` (xem `DESIGN.md`); trang khoa hoc co CSS rieng `pages/KhoaHoc.css` (motif cuon vo)
- Animation: GSAP, `motion`, Lottie, Rive
- Axios (`services/api.js`, tu gan Bearer token)
- Vitest cho unit test (test component bang `renderToString`, khong co jsdom)

### Backend (`backend/`)

- Node.js >= 20, Express 5, `mysql2/promise`
- Auth: `jsonwebtoken` (HS256), `bcrypt`, `google-auth-library` (Google Sign-In)
- `zod` (validate body chat), `express-rate-limit`
- `@google/generative-ai` (Gemini): chatbot, cau vi du theo thi, AI tao tu, giai thich cau hoi khoa hoc, sinh bai luyen them (model chinh `gemini-3.6-flash`, loi 503 thi chuyen `gemini-flash-lite-latest`)
- `nodemailer` (Gmail SMTP) cho email nhac hoc; `node-cron` (chi dung khi `ENABLE_INTERNAL_CRON=true`)
- `node:test` cho unit test

---

## 4. Cau truc repo

```txt
LearnTA-flscard/
  .github/workflows/ci.yml     CI: test + build FE/BE, lint FE (chan khi co loi)
  frontend/
    public/
      animation/ background/ sound/
      media/milestones/        video reward + videos.json (manifest)
    src/
      App.jsx                  routes + ChatbotWidget
      main.jsx                 providers: PageTransition > Toast > Auth > Chatbot
      config/api.js            API base URL
      components/
        auth/ProtectedRoute.jsx
        common/                BoCuc (layout + tab), EmptyState, Skeleton, StudyResult, khung phien hoc, ...
        BaiTapKhoaHoc.jsx      lam bai tap khoa hoc (ca che do on cau sai: prop onTap)
        NhapNhanhTu.jsx        them nhanh tu (dan danh sach / AI)
        ChatbotWidget.jsx      LearnBot
        RewardTikTokEffect.jsx reward video overlay
      contexts/                AuthContext, ToastContext, PageTransitionContext, ChatbotContext
      data/                    duLieuMau.js (mock fallback), tenseExamples.js
      hooks/                   useCombo, useTTS, useSoundEffect, useBoTuHoc, usePhanThuongPhien, useLuuKetQuaPhien
      pages/                   Trang*.jsx (xem muc 5)
      services/                api.js + authApi, deckApi, cardApi, studyApi, reviewApi, roadmapApi, courseApi, ...
      utils/                   srsReview, mistakeNotebook, phienHoc, nguonBoTu, baiTapKhoaHoc, caiDatHocTap, ...
  backend/
    src/
      server.js                khoi dong, check DB, bat cron noi bo neu co flag
      app.js                   CORS, trust proxy, mount routes, error handler
      config/                  db.js, env.js
      middleware/authMiddleware.js   requireAuth / optionalAuth
      controllers/             auth, deck, card, study, progress, mistake, review, user, roadmap, course
      routes/                  *Routes.js
      services/                aiService, chatContextService, emailService, reminderService, streakService, cronService
      utils/                   asyncHandler, http, srs, cardProgress, noiDungLoTrinh, khoaHoc
    database/
      schema.sql               schema day du (khop migration 001..012)
      seed.sql                 bo tu mau (user_id NULL)
      migrations/001..012      migration theo thu tu (da chay het tren production)
      content/lo-trinh.json    noi dung lo trinh (du an tu soan)
      private-content/         noi dung khoa hoc rieng (.gitignore, KHONG commit)
    scripts/                   seed-roadmaps, nhap-khoa-hoc, sinh-bai-luyen-them, thuMucKhoaHoc (dung chung),
                               seed-examples, seed-ai-examples, add_tense_examples_column, run-migration
    test/                      *.test.js (node:test)
  docs/google-cloud-deploy.md  huong dan deploy Cloud Run + Cloud SQL (luc con deploy tay)
  docs/khoa-hoc-48-ngay.md     dinh dang file khoa hoc + prompt trich PDF bang ChatGPT
  CLAUDE.md AGENTS.md PRODUCT.md DESIGN.md README.md HANDOFF.md PROJECT_CONTEXT.md
```

---

## 5. Routes frontend

Tab header khi dang nhap: Hom nay (`/dashboard`) · Khoa 48 ngay (`/khoa-hoc`) · Tu vung (`/decks`, gom ca `/practice`, `/roadmap`) · On tap (`/review`, kem so tu den han). Khach chi thay tab Khoa hoc.

```txt
/                         TrangChu            public
/login, /register         TrangDangNhap/DangKy public
/khoa-hoc                 TrangKhoaHoc        public (khoa hoc rieng cua user khi dang nhap: lich 48 o, "Hoc tiep Buoi X", "On N cau sai", tien do tung buoi; + danh sach lo trinh)
/roadmap                  -> chuyen huong /khoa-hoc
/roadmap/:slug            TrangChiTietLoTrinh public (cac chang theo thu tu + tien do)
/decks                    TrangTuVung         public (khi dang nhap: tab ?tab=buoi (tu vung tung buoi cua khoa) | cua-toi (TrangDanhSachBo, bo tu tao) | lo-trinh; khach: TrangDanhSachBo)
/practice                 TrangLuyenTap       public (chon bo tu (GET /decks?scope=learnable, nhom theo nguon), bo loc, thu tu, so luong roi chon che do; ?bo=<id> mo san mot bo)
/decks/:deckId            TrangChiTietBo      public (nut quay lai ve buoi hoc / chang lo trinh neu bo thuoc do)
/decks/:deckId/flashcard  TrangFlashcard      public
/decks/:deckId/quiz       TrangQuiz           public
/decks/:deckId/tu-luan    TrangTuLuan         public
/decks/:deckId/nghe-viet  TrangTuLuan loai="nghe-viet"  public (nghe roi go tu)
/decks/:deckId/ngu-canh   TrangQuiz loai="ngu-canh"     public (cau vi du bi che tu, chon tu)
/decks/:deckId/noi-tu     TrangNoiTu          public (ghep Anh-Viet theo vong 5 cap)
/decks/:deckId/hon-hop    TrangTuLuan loai="hon-hop"    public (moi cau 1 dang: trac nghiem/go nghia/go tu/nghe viet)
/dashboard                TrangDashboard      can dang nhap
/tu-sai                   TrangTuSai          can dang nhap (so tu sai)
/review                   TrangOnTapHomNay    can dang nhap (on tap SRS; moi level Lv0-5 chon che do The / Trac nghiem / Go tu; nut sang on cau bai tap)
/stats                    TrangThongKe        can dang nhap (co khoi Khoa hoc)
/decks/:deckId/add-word   TrangThemTu         can dang nhap
/cai-dat                  TrangCaiDat         can dang nhap
/khoa-hoc/:courseId/bai/:soBai  TrangBaiHoc   can dang nhap (?tab=tu-vung|ly-thuyet|bai-tap)
/khoa-hoc/on-tap          TrangOnCauHoi       can dang nhap (on cau bai tap den han cua moi buoi, SRS)
```

`/`, `/login`, `/register` dung video background "immersive" va khong hien ChatbotWidget. Cac trang con lai dung nen phang + ChatbotWidget.

---

## 6. API backend

Base: `/api`. "auth" = can `Authorization: Bearer <jwt>`.

```txt
GET    /health, /db-test

POST   /auth/register | /auth/login | /auth/google     rate limit 10 req/15 phut/IP
GET    /auth/me                                         auth

GET    /decks | /decks/:deckId                          optional auth; moi deck co `source` + `parent` (xem Quyen doc/ghi deck)
GET    /decks?scope=learnable                           optional auth; moi bo hoc duoc (user_id NULL + bo cua minh), xep theo nhom nguon
POST   /decks, PUT|DELETE /decks/:deckId                auth, chi chu deck, khong phai bo khoa hoc

GET    /decks/:deckId/cards
POST   /decks/:deckId/cards | /decks/:deckId/cards/import
PATCH  /decks/:deckId/cards/reorder
PUT|DELETE /cards/:cardId, PATCH /cards/:cardId/favorite  (favorite: chi can la chu bo, ke ca bo khoa hoc)
POST   /cards/generate-examples                         Gemini sinh cau vi du theo thi
POST   /cards/generate-words                            auth, rate limit 15 req/10 phut; body {chu_de | doan_van, so_luong 5-30}; Gemini tao tu (chua luu)

GET    /roadmaps | /roadmaps/:slug                      optional auth; lo trinh + chang (bo tu) + tien do nguoi hoc

GET|PATCH /cards/:cardId/progress, GET /decks/:deckId/progress-summary
GET|POST  /study-sessions, GET /study-sessions/summary
PATCH     /study-sessions/:id/finish, POST /study-sessions/:id/answers
POST      /quiz-results, GET /decks/:deckId/quiz-results/latest

GET|POST|DELETE /mistakes, POST /mistakes/bulk, PATCH|DELETE /mistakes/:id
GET /reviews, /reviews/due; POST /reviews, /reviews/bulk     auth, doc/ghi card_progress
PATCH /reviews/by-card/:cardId/result  body {result:"correct"|"wrong"} hoac {level:0-5}
DELETE /reviews/by-card/:cardId

GET /user/stats, GET|PATCH /user/settings               auth

GET  /courses                                           auth, chi khoa cua user (courses.user_id); moi buoi: word_count, learned/mastered_count (card_progress tren bo tu cua buoi), question/answered/correct_count (KHONG tinh cau luyen them source='extra'), due_count (cau den han on, ke ca luyen them)
GET  /courses/:courseId/lessons/:lessonNumber           auth; khoa cua nguoi khac tra 404; words[].mastery_level, questions[].last_correct
POST /course-questions/:questionId/answer               auth; body {answer}; server tu cham, ghi ket qua LAN GAN NHAT + lich on SRS (chi cau tung sai), tra {correct, mastery_level, next_review_at}
GET  /course-questions/due                              auth; cau den han on (next_review_at <= now) cua moi khoa thuoc user, toi da 100, kem lesson_number/course_id
GET  /course-questions/:questionId/audio                auth; chi chu khoa; phat file nghe tu bucket rieng tu (audio_path), Cache-Control private
POST /course-questions/:questionId/explain              auth, rate limit 60 req/5 phut; body {answer: chu cai | cau da go}; Gemini giai thich, cache theo (cau, dap an)

POST /chat                                              optional auth, rate limit 20 req/phut
POST /cron/daily-reminders | /cron/praise               header X-Cron-Secret
```

### Quyen doc/ghi deck (`deckController`)

- Doc (`canReadDeck`): deck mau (`user_id IS NULL`), deck `is_public = TRUE`, hoac deck cua chinh user.
- Nguon cua deck (`source`, suy ra tu bang noi, khong luu cot): `course` (tu vung 1 buoi cua khoa hoc rieng, co `course_lessons.deck_id`), `roadmap` (chang lo trinh, co `roadmap_decks`), `user` (bo tu tao), `sample` (bo mau cu `user_id NULL` ngoai lo trinh). `parent`: `{course_id, course_title, lesson_number, lesson_title}` hoac `{slug, title}` hoac null. FE: `utils/nguonBoTu.js` (nut quay lai o trang chi tiet bo; nhom bo o /practice).
- Anonymous: `GET /decks` tra deck mau + deck public (tru bo lo trinh/khoa hoc).
- Da dang nhap: `GET /decks` chi tra bo tu tao cua minh (khong gom bo khoa hoc, bo lo trinh, bo mau, bo public cua nguoi khac).
- `GET /decks?scope=learnable`: nguon hoc cho /practice — `user_id IS NULL` (lo trinh + mau) va bo cua minh (gom bo khoa hoc).
- Ghi (`canWriteDeck`, sua/xoa deck, them/sua/xoa/sap xep card): chi chu deck VA `source != course` (bo khoa hoc do script nhap quan ly; xoa bo se mat tien do SRS). Yeu thich chi can la chu bo (`isDeckOwner`). Deck mau khong ai sua duoc qua API.

### Chatbot `/api/chat`

- Body: `{ messages: [{ role: "user"|"model", parts: [{ text }] }], context?: { deckId?, cardId? } }`.
- Validate bang zod: toi da 200 tin, moi tin <= 2000 ky tu, tin cuoi phai la `user`. Server chi giu 20 tin gan nhat va bo cac tin `model` o dau (Gemini bat buoc history bat dau bang `user`).
- `chatContextService` doc tu DB theo id (co check `canReadDeck`): the dang hoc, toi da 30 tu trong deck, toi da 10 tu sai nhieu nhat (neu dang nhap), roi noi vao system prompt. Khong tin noi dung client gui.
- Frontend: trang hoc dat `<ChatbotTheDangHoc the={...} />` de bao the dang hien thi; widget lay `deckId` tu URL. **Chi bao the SAU KHI nguoi hoc da tra loi** (Quiz: `daTraLoi`, Tu luan: `daKiemTra`, On tap: the tu bao trong che do trac nghiem/go tu; Noi tu khong bao) — neu khong, goi y "Giai thich tu X" lo dap an. Flashcard va che do The o /review van bao ngay.

### SRS (mot luat cho moi che do, giong luyentu)

- Luat o `backend/src/utils/srs.js`, ban sao o `frontend/src/utils/srsReview.js`. Lv0-Lv5, khoang on 0/1/3/7/14/30 ngay (Lv>=1 den han luc 00:00 gio VN).
- Dung: len 1 cap, on lai sau khoang cua cap moi. Sai: xuong 1 cap (toi thieu 0), on lai ngay. Tu chon level: on lai theo level do.
- Tu vung: nguon dung la `card_progress`. Quiz/Tu luan ghi qua `POST /study-sessions/:id/answers` (`utils/cardProgress.updateProgressFromAnswer`); Flashcard va trang On tap ghi qua `PATCH /reviews/by-card/:cardId/result`. Moi cau tra loi chi ghi 1 lan.
- `POST /reviews/bulk` chi them tu chua co tien do (du lieu hoc luc chua dang nhap), khong ghi de level tren server.
- Lv5 (`status: "mastered"`) van quay lai khi den han.
- Cau bai tap khoa hoc: cung luat, luu o `course_question_progress`; chi vao lich on khi tra loi SAI (`utils/khoaHoc.lichOnCauHoi`), lam dung ngay lan dau thi `next_review_at` NULL (khong hoi lai).

### Khung phien hoc (frontend, dung chung cho moi che do hoc)

Che do moi nen ghep tu cac phan nay thay vi copy Quiz/Tu luan:

- `utils/phienHoc.js`: xao tron on dinh, doan tien trinh 10 cau, `tachKetQuaPhien`, `tachCauMau`, `cheTuTrongCau` (Ngu canh), `chiaVong` + `laCapNoiDung` (Noi tu).
- `utils/cauHoiTracNghiem.js`: sinh cau trac nghiem 4 dap an, cau Ngu canh, gan dang cau cho Hon hop (`ganLoaiCauHonHop`).
- `DanhSachDapAn` + `PhanHoiSaiTracNghiem`: nut dap an trac nghiem dung chung.
- `study_sessions.mode` / `quiz_results.question_type` = `listening`, `context`, `matching`, `mixed` (migration 008). `direction` luon la `en-vi` voi cac che do nay.
- Cai dat hoc (`utils/caiDatHocTap.js`) theo khoa: `flashcard`, `quiz`, `tuluan`, `ngheviet`, `nguCanh`, `noiTu`, `honHop`, `luyenTap`, `onTap` (`cheDoTheoLevel`, mac dinh Lv0 the, Lv1-2 trac nghiem, Lv3-5 go tu; tu Lv3 tat goi y).
- URL trang hoc: `?filter=&sort=&q=&n=&random=`. `n` = so tu toi da cua phien; `random=1|0` ghi de cai dat ngau nhien da luu. Seed xao tron doi moi lan mo trang (`taoHatGiong`).
- `hooks/useBoTuHoc`: tai deck + cards (fallback du lieu mau). `hooks/usePhanThuongPhien`: thanh tien do + reward. `hooks/useLuuKetQuaPhien`: tao/ket thuc study session, luu dap an (server cap nhat SRS), streak (chi goi `/user/stats` khi co token).
- `components/common/`: `TheCauHoiPhien`, `ThanhTienDoPhien`, `CaiDatPhienHoc`, `TheTrangThaiPhien`, `PhanHoiDung` (cau mau + `TenseExamplesCard` 6 thi), `StudyResult` (dung/sai kem level SRS moi, "Lam lai cau sai").

### Khoa hoc rieng (frontend)

- `utils/baiTapKhoaHoc.js`: cham bai (giong backend `utils/khoaHoc.js`), `phanBaiTap`/`nhomPhanBaiTap` (nhom chip theo nguon: Trong bai / Bai thi / Luyen them), `layCauBaiChinh` (bo cau luyen them), `tienDoBuoiHoc`, `timBuoiTiepTheo` (buoi gan nhat dang hoc do, xong thi buoi ke), `tongHopKhoaHoc` (tong ca khoa cho Dashboard/Thong ke).
- `BaiTapKhoaHoc`: moi cau tra loi goi `POST /course-questions/:id/answer` (loi mang khong chan lam bai) roi AI giai thich; "Tat ca"/"Con lai" chi gom cau cua tai lieu; da lam do thi mo san "Con lai". Prop `onTap`: lam het cau duoc truyen vao, an chip, ghi "Buoi X" tren moi cau.

---

## 7. Database

Schema day du: `backend/database/schema.sql` (khop migration 001..012). Bang:

| Bang | Vai tro |
|---|---|
| `users` | tai khoan (`password_hash` bcrypt hoac `google_id`), `current_streak`, `longest_streak`, `last_study_date`, `total_xp` |
| `decks` | bo tu; `user_id NULL` = deck mau; `is_public`, `streak`, `mastered_count` |
| `cards` | tu; `term_en`, `meaning_vi`, `example_sentence`, `note`, `pronunciation`, `part_of_speech`, `tense_examples` (JSON 6 thi), `is_favorite`, `sort_order` |
| `study_sessions`, `study_answers` | phien hoc va tung cau tra loi |
| `card_progress` | lich on SRS duy nhat cua tu vung: level 0-5 theo user/card, `next_review_at` |
| `mistake_words` | so tu sai, dem `mistake_count` |
| `card_reviews` | KHONG CON DUNG tu migration 007 (da gop vao `card_progress`), giu lai de doi chieu |
| `quiz_results` | ket qua quiz |
| `streak_logs` | log hoc theo ngay (gio VN, UTC+7) |
| `user_settings` | cai dat hoc + `email_reminders` |
| `roadmaps`, `roadmap_decks` | lo trinh hoc va cac bo tu mau (`user_id NULL`) theo thu tu; `deck_key` de nap lai khong trung (migration 009) |
| `courses`, `course_lessons`, `course_questions`, `course_question_explanations` | khoa hoc RIENG cua mot user (migration 010): bai hoc (ly thuyet JSON + bo tu rieng `deck_id`), cau hoi (trac nghiem / dien tu; `source` = lesson / exam / extra), cache giai thich AI |
| `course_question_progress` | ket qua lan tra loi gan nhat cua moi cau, UNIQUE (user_id, question_id) (migration 011); `mastery_level` + `next_review_at` = lich on SRS, NULL = khong nam trong lich on (migration 012). Buoi "xong" = hoc het tu + moi cau cua tai lieu dung |

Migration moi: them file `backend/database/migrations/00N_*.sql`, cap nhat `schema.sql` cho khop, **chay tay len Cloud SQL TRUOC khi push** code can bang/cot moi (backend tu deploy khi push). Da chay tren production: 001..012.

Noi dung lo trinh: `backend/database/content/lo-trinh.json` (du an tu bien soan, 3 lo trinh x 4 bo x 20 tu). Moi tu: `[tu, loai tu, nghia, cau vi du co chua tu, ghi chu]`. Test `noiDungLoTrinh.test.js` bat buoc moi cau vi du chua chinh tu do (de dung duoc che do Ngu canh). `npm run seed:roadmaps` nap lai an toan: cap nhat, them tu moi, KHONG xoa tu cu.

Khoa hoc rieng (tai lieu co ban quyen, chi chu khoa xem): noi dung o `backend/database/private-content/khoa-hoc-48-ngay/bai-XX/{lesson,exercises,answers}.json` + `extra.json` (luyen them, khong bat buoc) — da `.gitignore`, KHONG commit. Dinh dang + prompt trich PDF: `docs/khoa-hoc-48-ngay.md`.

- Kiem tra: `npm run nhap:khoa-hoc [-- --bai=XX]` (khong dung DB). Nhap: `npm run nhap:khoa-hoc -- --email=<email chu khoa> --apply [--bai=XX]`.
- Chay lai an toan: khop khoa theo (user_id, slug), bai theo so bai, tu theo `term_en`, cau hoi theo `question_key`. Cau khong con trong file bi xoa (mat tien do cau do); tu vung khong xoa. Chi xoa loi giai thich AI da luu cua cau doi noi dung.
- Tu vung moi bai thanh 1 bo tu rieng cua chu khoa (`source = course`, chi doc). `vocabulary[].example` (khong bat buoc) → `cards.example_sentence`, phai chua chinh tu; file khong co thi giu cau cu.
- Bai luyen them: `npm run sinh:luyen-them -- --bai=XX [--so-cau=40] [--ghi-de]` (Gemini) → `bai-XX/extra.json`, bo cau hong/trung de; soat roi nhap cung importer.

Nhap nhanh tu (trang chi tiet bo tu, nut "Them nhanh"): `components/NhapNhanhTu.jsx` — dan danh sach (`utils/nhapNhanhTu.js`: `tu | /phien am/ | loai tu | nghia | vi du | ghi chu`, van nhan "tu - nghia") hoac AI tao tu theo chu de / doan van. Tu trung (cung tu + loai tu) bi loai.

---

## 8. Du lieu phia client (localStorage)

| Key | File | Noi dung |
|---|---|---|
| `hocTA.authToken` | `services/api.js` | JWT (`getStoredAuthToken()` de biet da dang nhap trong code khong phai React) |
| `hocTA.cardFavorites` | `data/duLieuMau.js` | favorite cua mock data |
| `hoc_tu_vung_progress` | `utils/tienDoHocTap.js` | tien do flashcard/quiz gan nhat theo deck |
| `learnta_user_study_settings` | `utils/caiDatHocTap.js` | cai dat hoc theo mode |
| `streak_drop_srs_v1` | `utils/srsReview.js` | ban sao SRS (cung luat voi `srs.js`); khi dang nhap, du lieu tu `/reviews` ghi de ban local |
| `streak_drop_mistake_notebook_v1` | `utils/mistakeNotebook.js` | so tu sai; khi dang nhap dong bo voi `/mistakes` (khach chi luu local) |
| `streak_drop_study_sessions_v1` | `utils/studySessionHistory.js` | lich su phien hoc |

Tien do va ket qua bai tap khoa hoc KHONG luu local — chi tren server (`course_question_progress`).

---

## 9. Tinh nang chinh

- **Khoa hoc**: lo trinh (chang → bo tu mau, tien do hoc/thuoc); khoa hoc rieng (lich 48 buoi, buoi hoc Tu vung · Ly thuyet · Bai tap, AI giai thich tung cau, luyen them AI, "Con lai", on cau sai theo SRS, tien do tung buoi).
- **Bo tu / the**: CRUD, them nhanh (dan danh sach, AI tao tu), sap xep keo tha, yeu thich, loc Tat ca/Yeu thich/Moi them.
- **Luyen tap** (`/practice`): chon bo (nhom theo nguon), bo loc, so luong, 7 che do: Flashcard, Trac nghiem, Tu luan, Nghe viet, Ngu canh, Noi tu, Hon hop.
- **Flashcard**: 2 chieu, Space lat the, mui ten chuyen the, TTS, cau vi du theo 6 thi (`TenseExamplesCard`).
- **Quiz trac nghiem**: can >= 4 tu, 1 dung + 3 nhieu; combo, am thanh, reward.
- **Reward**: video tu `media/milestones/videos.json`, kich hoat khi du so cau dung (mac dinh 10); ton trong `prefers-reduced-motion`.
- **On tap hom nay** (`/review`) va **So tu sai** (`/tu-sai`): SRS + dong bo backend; nut sang on cau bai tap khoa hoc.
- **Dashboard / Thong ke / Streak**: `GET /user/stats`, streak tinh theo ngay VN; Dashboard co muc hoc tiep khoa hoc + cau can on; Thong ke co khoi Khoa hoc.
- **Email**: 18:00 VN khen user da hoc, 23:00 VN nhac user chua hoc. Production goi qua Cloud Scheduler -> `/api/cron/*`.
- **LearnBot**: xem muc 6. Render markdown sau khi escape HTML.

---

## 10. Bien moi truong

### Backend (`backend/.env`, tren Cloud Run dat trong service config)

```txt
# DB: local dung DB_HOST/DB_PORT qua Cloud SQL Auth Proxy (= DB production!); Cloud Run dung INSTANCE_CONNECTION_NAME
DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
INSTANCE_CONNECTION_NAME DB_SOCKET_PATH
JWT_SECRET JWT_EXPIRES_IN
GOOGLE_CLIENT_ID
CORS_ORIGIN                 danh sach cach nhau boi dau phay
GEMINI_API_KEY
GMAIL_USER GMAIL_APP_PASS
CRON_SECRET
ENABLE_INTERNAL_CRON        "true" de chay node-cron noi bo (mac dinh tat)
PORT                        mac dinh 8080
```

### Frontend (`frontend/.env.local`)

```txt
VITE_API_BASE_URL           mac dinh dev: http://localhost:8080
VITE_GOOGLE_CLIENT_ID
```

---

## 11. Chay, test, deploy

```bash
# Backend (can Cloud SQL Auth Proxy -> DB production, hoac MySQL local; xem README.md)
cd backend && npm install && npm run dev      # http://localhost:8080
npm test                                      # node --test, khong can DB

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
npm test                                      # vitest
npm run build
npm run lint                                  # 0 loi, CI chan khi co loi
```

Scripts du lieu (chay tu `backend/`, can proxy tru khi ghi ro): `npm run seed:roadmaps`, `npm run nhap:khoa-hoc` (khong `--apply` thi khong can DB), `npm run sinh:luyen-them` (can `GEMINI_API_KEY`, khong can DB), `npm run seed:examples`, `npm run seed:ai-examples`, `npm run migrate:tense-examples`.

Deploy (push `main`):

- Frontend: Vercel tu deploy (`frontend/vercel.json` rewrite SPA).
- Backend: trigger Cloud Build `^main$` (cau hinh tren GCP, khong nam trong repo) build + deploy Cloud Run `flashcard-backend`. Kiem tra: `gcloud builds list --limit 2` (cot COMMIT_SHA). Deploy tay khi can: `gcloud run deploy flashcard-backend --source . --region asia-southeast1` (trong `backend/`).
- Migration: chay tay truoc khi push (muc 7).

---

## 12. Nguyen tac khi sua code

1. Doc `CLAUDE.md` va chay `git status --short` truoc khi sua.
2. Giu phong cach dat ten tieng Viet (`TrangXxx`, `layXxx`, `luuXxx`) va copy UI tieng Viet co dau.
3. Moi goi API qua `frontend/src/services/*`, khong goi axios truc tiep trong page.
4. Route backend moi: validate input (`utils/http.js` hoac zod), boc `asyncHandler`, check quyen bang `canReadDeck`/`canWriteDeck` (khoa hoc: loc `courses.user_id`).
5. Khong tin du lieu client cho noi dung se dua vao prompt AI hoac DB; chi nhan id roi doc lai tu DB. Dap an bai tap khoa hoc luon cham lai tren server.
6. Them test cho logic thuan (utils/services) khi sua; CI phai xanh (test + lint + build).
7. Reward/animation la lop phu, khong duoc lam hong luong hoc; test ca desktop va mobile.
8. Khong commit `node_modules`, `.env`, file media ban quyen, noi dung `private-content/`.
9. Khong them tai khoan demo seed tru khi duoc yeu cau; test auth bang cach dang ky user moi.
10. Backend local dung DB production: bam thu o che do khach van ghi phien hoc that; thu giao dien khi dang nhap bang API gia (xem HANDOFF muc 5).

---

## 13. Ghi chu encode

File nay viet tieng Viet khong dau de tranh loi encoding tren terminal Windows. Source UI van dung tieng Viet co dau.
