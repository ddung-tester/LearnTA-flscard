# PROJECT_CONTEXT.md

> Cap nhat: 2026-09-23. File nay mo ta trang thai THAT cua code tren `main`.
> Khi code thay doi lon (route, bang DB, luong auth), cap nhat lai file nay.

> **AI/dev moi vao du an: doc `HANDOFF.md` truoc** (da lam gi, chua lam gi, deploy, plan tiep theo).

## 1. Ten du an

**LearnTA / Streak Drop** — ung dung web hoc tu vung tieng Anh cho nguoi Viet.

Nguoi dung tao bo tu (deck), them cap tu Anh - Viet, hoc bang flashcard, quiz trac nghiem, tu luan, on tap theo lich SRS, xem so tu sai, thong ke, streak, va hoi chatbot AI (LearnBot).

- Frontend: https://dungdinh-vocab.vercel.app (Vercel)
- Backend: Google Cloud Run
- Database: Google Cloud SQL (MySQL 8)

---

## 2. Trang thai hien tai

```txt
Status: Dang chay production (single user la chu du an)
Frontend: React/Vite, goi API that qua services/*; con mock data lam fallback khi API loi
Backend: Express 5 + MySQL, day du CRUD, auth JWT + Google, SRS, mistakes, stats, email, chatbot
Tests: node:test (backend) + vitest (frontend), chay tren GitHub Actions
```

### Viec con ton dong

- `TrangChiTietBo.jsx` (~1800 dong) va `TrangTuLuan.jsx` (~1300) van lon. Quiz va Tu luan da dung chung khung phien hoc (xem muc "Khung phien hoc"); phan con lai cua Tu luan chu yeu la logic go/goi y/nhap lai.
- Frontend lint co 17 loi san (chu yeu `react-hooks/set-state-in-effect`, tap trung o `RewardTikTokEffect.jsx`). CI dang de lint `continue-on-error`.
- Dependency `resend` trong `backend/package.json` khong duoc dung (email gui qua Nodemailer/Gmail).
- Video reward (~70 MB) nam trong `frontend/public/media/milestones/` va lich su git.

---

## 3. Tech stack

### Frontend (`frontend/`)

- React 19, Vite 8, JavaScript, React Router DOM 7
- Tailwind CSS 4 + design tokens trong `index.css` (xem `DESIGN.md`)
- Animation: GSAP, `motion`, Lottie, Rive
- Axios (`services/api.js`, tu gan Bearer token)
- Vitest cho unit test

### Backend (`backend/`)

- Node.js >= 20, Express 5, `mysql2/promise`
- Auth: `jsonwebtoken` (HS256), `bcrypt`, `google-auth-library` (Google Sign-In)
- `zod` (validate body chat), `express-rate-limit`
- `@google/generative-ai` (Gemini): chatbot + sinh cau vi du theo thi
- `nodemailer` (Gmail SMTP) cho email nhac hoc; `node-cron` (chi dung khi `ENABLE_INTERNAL_CRON=true`)
- `node:test` cho unit test

---

## 4. Cau truc repo

```txt
LearnTA-flscard/
  .github/workflows/ci.yml     CI: test + build FE/BE, lint FE (khong chan)
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
        common/                BoCuc (layout), EmptyState, Skeleton, StudyResult, ...
        ChatbotWidget.jsx      LearnBot
        RewardTikTokEffect.jsx reward video overlay
      contexts/                AuthContext, ToastContext, PageTransitionContext, ChatbotContext
      data/                    duLieuMau.js (mock fallback), tenseExamples.js
      hooks/                   useCombo, useTTS, useSoundEffect, useBoTuHoc, usePhanThuongPhien, useLuuKetQuaPhien
      pages/                   Trang*.jsx (xem muc 5)
      services/                api.js + authApi, deckApi, cardApi, studyApi, reviewApi, ...
      utils/                   srsReview, mistakeNotebook, tienDoHocTap, caiDatHocTap, ...
  backend/
    src/
      server.js                khoi dong, check DB, bat cron noi bo neu co flag
      app.js                   CORS, trust proxy, mount routes, error handler
      config/                  db.js, env.js
      middleware/authMiddleware.js   requireAuth / optionalAuth
      controllers/             auth, deck, card, study, progress, mistake, review, user
      routes/                  *Routes.js
      services/                aiService, chatContextService, emailService, reminderService, streakService, cronService
      utils/                   asyncHandler, http, cardProgress
    database/
      schema.sql               schema day du
      seed.sql                 bo tu mau (user_id NULL)
      migrations/001..006      migration theo thu tu
    scripts/                   seed-examples, seed-ai-examples, migration runners
    test/                      *.test.js (node:test)
  docs/google-cloud-deploy.md  huong dan deploy Cloud Run + Cloud SQL
  CLAUDE.md AGENTS.md PRODUCT.md DESIGN.md README.md PROJECT_CONTEXT.md
```

---

## 5. Routes frontend

```txt
/                         TrangChu            public
/login, /register         TrangDangNhap/DangKy public
/decks                    TrangDanhSachBo     public
/practice                 TrangLuyenTap       public (chon bo tu, bo loc, thu tu, so luong roi chon che do; ?bo=<id> mo san mot bo)
/roadmap                  TrangLoTrinh        public (danh sach lo trinh)
/roadmap/:slug            TrangChiTietLoTrinh public (cac chang theo thu tu + tien do)
/decks/:deckId            TrangChiTietBo      public
/decks/:deckId/flashcard  TrangFlashcard      public
/decks/:deckId/quiz       TrangQuiz           public
/decks/:deckId/tu-luan    TrangTuLuan         public
/decks/:deckId/nghe-viet  TrangTuLuan loai="nghe-viet"  public (nghe roi go tu)
/decks/:deckId/ngu-canh   TrangQuiz loai="ngu-canh"     public (cau vi du bi che tu, chon tu)
/decks/:deckId/noi-tu     TrangNoiTu          public (ghep Anh-Viet theo vong 5 cap)
/decks/:deckId/hon-hop    TrangTuLuan loai="hon-hop"    public (moi cau 1 dang: trac nghiem/go nghia/go tu/nghe viet)
/dashboard                TrangDashboard      can dang nhap
/tu-sai                   TrangTuSai          can dang nhap (so tu sai)
/review                   TrangOnTapHomNay    can dang nhap (on tap SRS; moi level Lv0-5 chon che do The / Trac nghiem / Go tu)
/stats                    TrangThongKe        can dang nhap
/decks/:deckId/add-word   TrangThemTu         can dang nhap
/cai-dat                  TrangCaiDat         can dang nhap
/khoa-hoc                 TrangKhoaHoc        can dang nhap (khoa hoc rieng cua user)
/khoa-hoc/:courseId/bai/:soBai  TrangBaiHoc   can dang nhap (?tab=ly-thuyet|tu-vung|bai-tap)
```

`/`, `/login`, `/register` dung video background "immersive" va khong hien ChatbotWidget. Cac trang con lai dung nen phang + ChatbotWidget.

---

## 6. API backend

Base: `/api`. "auth" = can `Authorization: Bearer <jwt>`.

```txt
GET    /health, /db-test

POST   /auth/register | /auth/login | /auth/google     rate limit 10 req/15 phut/IP
GET    /auth/me                                         auth

GET    /decks | /decks/:deckId                          optional auth
POST   /decks, PUT|DELETE /decks/:deckId                auth, chi chu deck

GET    /decks/:deckId/cards
POST   /decks/:deckId/cards | /decks/:deckId/cards/import
PATCH  /decks/:deckId/cards/reorder
PUT|DELETE /cards/:cardId, PATCH /cards/:cardId/favorite
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

GET  /courses | /courses/:courseId/lessons/:lessonNumber auth, chi chu khoa (courses.user_id); khoa cua nguoi khac tra 404
POST /course-questions/:questionId/explain              auth, rate limit 60 req/5 phut; body {answer: chu cai | cau da go}; Gemini giai thich, cache theo (cau, dap an)

POST /chat                                              optional auth, rate limit 20 req/phut
POST /cron/daily-reminders | /cron/praise               header X-Cron-Secret
```

### Quyen doc/ghi deck (theo code `deckController.canReadDeck` / `canWriteDeck`)

- Doc: deck mau (`user_id IS NULL`), deck `is_public = TRUE`, hoac deck cua chinh user.
- Anonymous: `GET /decks` tra deck mau + deck public.
- Da dang nhap: `GET /decks` tra deck cua minh + deck mau + deck public.
- `GET /decks` KHONG tra cac bo tu thuoc lo trinh (co trong `roadmap_decks`); cac bo nay chi hien o `/roadmap`, van doc duoc qua `/decks/:deckId`.
- Ghi (sua/xoa deck, card): chi chu deck (`user_id` = user trong token). Deck mau khong ai sua duoc qua API.

### Chatbot `/api/chat`

- Body: `{ messages: [{ role: "user"|"model", parts: [{ text }] }], context?: { deckId?, cardId? } }`.
- Validate bang zod: toi da 200 tin, moi tin <= 2000 ky tu, tin cuoi phai la `user`. Server chi giu 20 tin gan nhat va bo cac tin `model` o dau (Gemini bat buoc history bat dau bang `user`).
- `chatContextService` doc tu DB theo id (co check `canReadDeck`): the dang hoc, toi da 30 tu trong deck, toi da 10 tu sai nhieu nhat (neu dang nhap), roi noi vao system prompt. Khong tin noi dung client gui.
- Frontend: cac trang hoc dat `<ChatbotTheDangHoc the={...} />` de bao the dang hien thi; widget lay `deckId` tu URL.

### SRS (mot luat cho moi che do, giong luyentu)

- Luat o `backend/src/utils/srs.js`, ban sao o `frontend/src/utils/srsReview.js`. Lv0-Lv5, khoang on 0/1/3/7/14/30 ngay (Lv>=1 den han luc 00:00 gio VN).
- Dung: len 1 cap, on lai sau khoang cua cap moi. Sai: xuong 1 cap (toi thieu 0), on lai ngay. Tu chon level: on lai theo level do.
- Nguon dung la `card_progress`. Quiz/Tu luan ghi qua `POST /study-sessions/:id/answers`; Flashcard va trang On tap ghi qua `PATCH /reviews/by-card/:cardId/result`. Moi cau tra loi chi ghi 1 lan.
- `POST /reviews/bulk` chi them tu chua co tien do (du lieu hoc luc chua dang nhap), khong ghi de level tren server.
- Lv5 (`status: "mastered"`) van quay lai khi den han.

### Khung phien hoc (frontend, dung chung cho moi che do hoc)

Che do moi (nghe viet, noi tu, ...) nen ghep tu cac phan nay thay vi copy Quiz/Tu luan:

- `utils/phienHoc.js`: xao tron on dinh, doan tien trinh 10 cau, `tachKetQuaPhien` (chi tinh the co trong phien), `tachCauMau` (to dam tu trong cau mau), `cheTuTrongCau` (Ngu canh), `chiaVong` + `laCapNoiDung` (Noi tu).
- `utils/cauHoiTracNghiem.js`: sinh cau trac nghiem 4 dap an, cau Ngu canh, gan dang cau cho Hon hop (`ganLoaiCauHonHop`).
- `DanhSachDapAn` + `PhanHoiSaiTracNghiem`: nut dap an trac nghiem dung chung (Trac nghiem, Ngu canh, cau trac nghiem trong Hon hop).
- Che do moi: `study_sessions.mode` / `quiz_results.question_type` = `listening`, `context`, `matching`, `mixed` (migration 008). `direction` luon la `en-vi` voi cac che do nay.
- Cai dat hoc (`utils/caiDatHocTap.js`) theo khoa: `flashcard`, `quiz`, `tuluan`, `ngheviet`, `nguCanh`, `noiTu`, `honHop`, `luyenTap` (lua chon trang Luyen tap), `onTap` (`cheDoTheoLevel`, mac dinh Lv0 the, Lv1-2 trac nghiem, Lv3-5 go tu; tu Lv3 tat goi y).
- URL trang hoc: `?filter=&sort=&q=&n=&random=`. `n` = so tu toi da cua phien (xao truoc roi cat, nen "20 tu ngau nhien" la 20 tu bat ky); `random=1|0` ghi de cai dat ngau nhien da luu. Seed xao tron doi moi lan mo trang (`taoHatGiong`). Chon the cho phien: `chonTheChoPhien`.
- `hooks/useBoTuHoc`: tai deck + cards (fallback du lieu mau). `hooks/usePhanThuongPhien`: thanh tien do + reward. `hooks/useLuuKetQuaPhien`: tao/ket thuc study session, luu dap an (server cap nhat SRS), streak.
- `components/common/`: `TheCauHoiPhien`, `ThanhTienDoPhien`, `CaiDatPhienHoc`, `TheTrangThaiPhien`, `PhanHoiDung` (cau mau cua the + `TenseExamplesCard` 6 thi), `StudyResult` (danh sach dung/sai kem level SRS moi, "Lam lai cau sai").

---

## 7. Database

Schema day du: `backend/database/schema.sql`. Bang:

| Bang | Vai tro |
|---|---|
| `users` | tai khoan (`password_hash` bcrypt hoac `google_id`), `current_streak`, `longest_streak`, `last_study_date` |
| `decks` | bo tu; `user_id NULL` = deck mau; `is_public`, `streak`, `mastered_count` |
| `cards` | tu; `term_en`, `meaning_vi`, `example_sentence`, `note`, `pronunciation`, `part_of_speech`, `is_favorite`, `sort_order` (+ `tense_examples` JSON, xem luu y duoi) |
| `study_sessions`, `study_answers` | phien hoc va tung cau tra loi |
| `card_progress` | lich on SRS duy nhat: level 0-5 theo user/card, `next_review_at` |
| `mistake_words` | so tu sai, dem `mistake_count` |
| `card_reviews` | KHONG CON DUNG tu migration 007 (da gop vao `card_progress`) |
| `quiz_results` | ket qua quiz |
| `streak_logs` | log hoc theo ngay (gio VN, UTC+7) |
| `user_settings` | cai dat hoc (+ `email_reminders`, xem luu y duoi) |
| `roadmaps`, `roadmap_decks` | lo trinh hoc va cac bo tu mau (`user_id NULL`) theo thu tu; `deck_key` de nap lai khong trung (migration 009) |
| `courses`, `course_lessons`, `course_questions`, `course_question_explanations` | khoa hoc RIENG cua mot user (migration 010): bai hoc (ly thuyet JSON + bo tu rieng `deck_id`), cau hoi (trac nghiem / dien tu), cache giai thich AI |

Luu y: `schema.sql` CHUA co 2 cot duoc them bang script rieng:

- `cards.tense_examples` — `npm run migrate:tense-examples`
- `user_settings.email_reminders` — `backend/database/add_email_reminders.sql` (hoac `node scripts/run-migration.js`)

Dung DB moi tu `schema.sql` thi phai chay them 2 buoc nay.

Migration moi: them file `backend/database/migrations/00N_*.sql`, cap nhat `schema.sql` cho khop.

Thu tu deploy: chay migration 007 → 008 → 009 TRUOC khi deploy backend (`GET /decks` doc bang `roadmap_decks`; thieu 009 thi danh sach bo tu loi). Sau 009: `npm run seed:roadmaps` (trong `backend/`) de nap lo trinh.

Noi dung lo trinh: `backend/database/content/lo-trinh.json` (du an tu bien soan, 3 lo trinh x 4 bo x 20 tu). Moi tu: `[tu, loai tu, nghia, cau vi du co chua tu, ghi chu]`. Test `noiDungLoTrinh.test.js` bat buoc moi cau vi du chua chinh tu do (de dung duoc che do Ngu canh). Script nap lai an toan: cap nhat, them tu moi, KHONG xoa tu cu.

Khoa hoc rieng (tai lieu co ban quyen, chi chu khoa xem): noi dung o `backend/database/private-content/khoa-hoc-48-ngay/bai-XX/{lesson,exercises,answers}.json` (da `.gitignore`, KHONG commit). Nhap: `npm run nhap:khoa-hoc` (chi kiem tra file) roi `npm run nhap:khoa-hoc -- --email=<email chu khoa> --apply [--bai=13]`. Chay lai an toan; tu vung moi bai thanh 1 bo tu rieng cua chu khoa. Can migration 010 truoc. Prompt trich xuat: `docs/khoa-hoc-48-ngay.md`.

Nhap nhanh tu (trang chi tiet bo tu, nut "Them nhanh"): `components/NhapNhanhTu.jsx` — dan danh sach (`utils/nhapNhanhTu.js`: `tu | /phien am/ | loai tu | nghia | vi du | ghi chu`, van nhan "tu - nghia") hoac AI tao tu theo chu de / doan van. Tu trung (cung tu + loai tu) bi loai.

---

## 8. Du lieu phia client (localStorage)

| Key | File | Noi dung |
|---|---|---|
| `hocTA.authToken` | `services/api.js` | JWT |
| `hocTA.cardFavorites` | `data/duLieuMau.js` | favorite cua mock data |
| `hoc_tu_vung_progress` | `utils/tienDoHocTap.js` | tien do flashcard/quiz gan nhat theo deck |
| `learnta_user_study_settings` | `utils/caiDatHocTap.js` | cai dat hoc theo mode |
| `streak_drop_srs_v1` | `utils/srsReview.js` | ban sao SRS; khi dang nhap, du lieu tu `/reviews` ghi de ban local |
| `streak_drop_mistake_notebook_v1` | `utils/mistakeNotebook.js` | so tu sai; dong bo voi `/mistakes` |
| `streak_drop_study_sessions_v1` | `utils/studySessionHistory.js` | lich su phien hoc |

SRS client (`srsReview.js`): ease `again` -1 level (on lai sau 4 gio), `hard` giu level (+1 ngay), `good` +1 (+3 ngay), `easy` +2 (+7 ngay); level 5 = mastered. Khi merge voi backend giu level/reviewCount lon hon.

Backend `cardProgress`: dung +1 / sai -1 mastery (0-5); on lai sau 1 ngay (level 0-1), 3 ngay (2-3), 7 ngay (4), 14 ngay (5).

---

## 9. Tinh nang chinh

- **Deck/card**: CRUD, import nhieu dong (`word - meaning`, `word, meaning`, `word | meaning`), sap xep keo tha, yeu thich, loc Tat ca/Yeu thich/Moi them.
- **Flashcard**: 2 chieu, Space lat the, mui ten chuyen the, TTS, cau vi du theo 6 thi (`TenseExamplesCard`).
- **Quiz trac nghiem**: can >= 4 tu, 1 dung + 3 nhieu chon theo do dai gan nhau; combo, am thanh, reward.
- **Tu luan**: go dap an, chuan hoa trim/lowercase/khoang trang, bo qua de xem dap an.
- **Reward**: video tu `media/milestones/videos.json`, kich hoat khi du so cau dung (mac dinh 10); ton trong `prefers-reduced-motion`.
- **On tap hom nay** (`/review`) va **So tu sai** (`/tu-sai`): SRS client + dong bo backend.
- **Dashboard / Thong ke / Streak**: `GET /user/stats`, streak tinh theo ngay VN.
- **Email**: 18:00 VN khen user da hoc, 23:00 VN nhac user chua hoc. Production goi qua Cloud Scheduler -> `/api/cron/*`.
- **LearnBot**: xem muc 6. Render markdown sau khi escape HTML.

---

## 10. Bien moi truong

### Backend (`backend/.env`, tren Cloud Run dat trong service config)

```txt
# DB: local dung DB_HOST/DB_PORT qua Cloud SQL Auth Proxy; Cloud Run dung INSTANCE_CONNECTION_NAME
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
# Backend (can Cloud SQL Auth Proxy hoac MySQL local, xem README.md)
cd backend && npm install && npm run dev      # http://localhost:8080
npm test                                      # node --test, khong can DB

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
npm test                                      # vitest
npm run build
npm run lint
```

Scripts du lieu (chay tu `backend/`): `npm run seed:examples`, `npm run seed:ai-examples`, `npm run migrate:tense-examples`, `node scripts/run-migration.js`.

Deploy:

- Frontend: Vercel tu deploy khi `main` thay doi (`frontend/vercel.json` rewrite SPA).
- Backend: Cloud Run, xem `docs/google-cloud-deploy.md`.

---

## 12. Nguyen tac khi sua code

1. Doc `CLAUDE.md` va chay `git status --short` truoc khi sua.
2. Giu phong cach dat ten tieng Viet (`TrangXxx`, `layXxx`, `luuXxx`) va copy UI tieng Viet co dau.
3. Moi goi API qua `frontend/src/services/*`, khong goi axios truc tiep trong page.
4. Route backend moi: validate input (`utils/http.js` hoac zod), boc `asyncHandler`, check quyen bang `canReadDeck`/`canWriteDeck`.
5. Khong tin du lieu client cho noi dung se dua vao prompt AI hoac DB; chi nhan id roi doc lai tu DB.
6. Them test cho logic thuan (utils/services) khi sua; CI phai xanh.
7. Reward/animation la lop phu, khong duoc lam hong luong hoc; test ca desktop va mobile.
8. Khong commit `node_modules`, `.env`, file media ban quyen.
9. Khong them tai khoan demo seed tru khi duoc yeu cau; test auth bang cach dang ky user moi.

---

## 13. Ghi chu encode

File nay viet tieng Viet khong dau de tranh loi encoding tren terminal Windows. Source UI van dung tieng Viet co dau.
