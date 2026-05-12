# PROJECT_CONTEXT.md

## 1. Ten du an

**English Flashcard & Quiz App**

Ung dung web hoc tu vung tieng Anh cho nguoi hoc Viet Nam. Nguoi dung tao bo tu, them cap tu Anh - Viet, hoc bang flashcard, lam quiz trac nghiem, lam quiz tu luan va nhan reward effect khi dat moc cau dung.

Du an duoc xay dung de luyen React, JavaScript, Node.js, Express va MySQL. Trang thai hien tai: **frontend mock da lam phan lon luong san pham**, backend/database moi o muc scaffold de ket noi sau.

---

## 2. Trang thai hien tai

```txt
Status: Frontend mock gan hoan thien
Current focus: React/Vite client
Backend status: Express scaffold + health check + db-test, chua co CRUD API
Data status: Mock data trong frontend, progress/favorite luu localStorage
Next recommended task: Ket noi backend CRUD cho decks/cards hoac hoan thien polish frontend truoc khi persist
```

### Da co the dung thu

- Trang chu va layout ung dung.
- Danh sach bo tu.
- Chi tiet bo tu.
- Them/sua bo tu tren state frontend.
- Them/sua/xoa/import tu trong bo tren state frontend.
- Yeu thich tu va loc theo yeu thich.
- Flashcard 2 chieu hoc.
- Quiz trac nghiem 2 chieu hoc.
- Quiz tu luan 2 chieu hoc.
- Cai dat hoc: chi hoc tu yeu thich, thu tu ngau nhien.
- Reward khi tra loi dung du moc.
- Combo display va reward progress.
- Luu tien do quiz gan nhat bang `localStorage`.
- Luu favorite cards bang `localStorage`.

### Chua xong / can luu y

- Them/sua/xoa/import deck/card hien chi cap nhat state trong UI; refresh trang se mat thay doi.
- Backend chua co route CRUD cho decks/cards.
- Frontend chua goi API backend.
- Chua co auth.
- Chua co luu du lieu that vao MySQL tu giao dien.
- Mot so file dang co thay doi chua commit trong reward/quiz/tu-luan; khi sua tiep can doc diff truoc de tranh ghi de.

---

## 3. Muc tieu san pham

Nguoi hoc co the tao mot bo tu, them nhanh tu moi, on tap bang flashcard, kiem tra bang trac nghiem hoac tu luan trong mot phien 10-20 phut. Trai nghiem can ro rang, it ma sat, than thien nhung khong tre con.

Thanh cong cua MVP:

- Nguoi dung tao/moi mot deck.
- Them duoc card Anh - Viet.
- Hoc flashcard duoc theo 2 chieu.
- Lam quiz trac nghiem duoc khi deck co it nhat 4 tu.
- Lam tu luan duoc voi dap an nhap tay.
- Co tong ket ket qua.
- Du lieu deck/card duoc persist qua backend/MySQL.

Hien tai frontend da mo phong duoc hau het luong tren, nhung persist data chua xong.

---

## 4. Tech stack thuc te

### Frontend

- React 19
- Vite 8
- JavaScript
- React Router DOM 7
- Tailwind CSS 4
- GSAP va `@gsap/react` cho reward animation
- Axios da cai nhung hien chua dung trong luong chinh
- localStorage cho progress va favorite

### Backend

- Node.js
- Express 5
- MySQL
- `mysql2/promise`
- CORS
- dotenv
- nodemon cho dev

### Database

- MySQL schema nam tai `server/database/schema.sql`
- Database: `english_flashcard_quiz_app`
- Bang hien co: `decks`, `cards`

---

## 5. Cau truc repo hien tai

```txt
prj_hocTA/
  client/
    public/
      favicon.svg
      icons.svg
      sound/
        bigo.mp3
      rewards/
        videos.json
        video1.mp4 ... video5.mp4
    src/
      assets/
        hero.png
        react.svg
        vite.svg
      components/
        common/
          AnimatedModal.jsx
          BoCuc.jsx
          ComboDisplay.jsx
          ModeSwitch.jsx
          RewardProgressBar.jsx
          StudySettingsPopover.jsx
          ToastMessage.jsx
          ToggleSwitch.jsx
          TypingEffect.jsx
        RewardMagicOverlay.jsx
        RewardMagicOverlay.css
        RewardTikTokEffect.jsx
        RewardTikTokEffect.css
      data/
        duLieuMau.js
      hooks/
        useCombo.js
      pages/
        TrangChu.jsx
        TrangDanhSachBo.jsx
        TrangChiTietBo.jsx
        TrangThemTu.jsx
        TrangFlashcard.jsx
        TrangQuiz.jsx
        TrangTuLuan.jsx
      utils/
        tienDoHocTap.js
      App.jsx
      index.css
      main.jsx
    package.json
    vite.config.js

  server/
    database/
      schema.sql
      seed.sql
    src/
      config/
        db.js
      app.js
      server.js
    package.json

  docs/
    .gitkeep

  PRODUCT.md
  DESIGN.md
  DESIGN.json
  README.md
  CLAUDE.md
  PROJECT_CONTEXT.md
```

---

## 6. Routes frontend

```txt
/                         Trang chu
/decks                    Danh sach bo tu
/decks/:deckId            Chi tiet bo tu
/decks/:deckId/add-word   Trang them tu rieng, dang co trong route
/decks/:deckId/flashcard  Hoc flashcard
/decks/:deckId/quiz       Quiz trac nghiem
/decks/:deckId/tu-luan    Quiz tu luan
```

`App.jsx` boc cac route bang `BoCuc`. Tat ca route hien dung mock data tu `client/src/data/duLieuMau.js`.

---

## 7. Du lieu frontend hien tai

### Mock data

File: `client/src/data/duLieuMau.js`

Exports chinh:

- `danhSachBo`: danh sach deck mau.
- `danhSachThe`: danh sach card mau.
- `layTheoBoId(boId)`: lay cards theo deck, sap xep tu moi truoc.
- `layBoTheoId(boId)`: lay deck theo id.
- `laTuYeuThich(the)`: kiem tra favorite.
- `laTuMoiThem(the)`: kiem tra tu moi them trong 3 ngay gan nhat.
- `capNhatTrangThaiYeuThichThe(cardId, isFavorite)`: cap nhat favorite trong mock data va localStorage.
- `locTuYeuThich(danhSach, chiHocTuYeuThich)`: loc danh sach theo favorite.

### localStorage

File: `client/src/utils/tienDoHocTap.js`

- Key tien do: `hoc_tu_vung_progress`
- Key favorite card: `hocTA.cardFavorites`
- Tien do quiz luu duoc: `correct`, `review`, `total`, `lastQuizAt`
- Tien do flashcard utility co san: `luuTienDoFlashcard`, nhung luong flashcard hien tai chua thay dung ro trong trang.

---

## 8. Chuc nang frontend chinh

### 8.1. Danh sach bo tu

File: `client/src/pages/TrangDanhSachBo.jsx`

- Hien danh sach deck tu `danhSachBo`.
- Hien so tu trong tung deck.
- Hien ket qua quiz gan nhat neu co localStorage progress.
- Them deck moi bang modal.
- Sua title/description cua deck bang modal.
- Click card hoac nhan Enter/Space de vao chi tiet deck.
- Thay doi them/sua deck chi nam trong state cua trang.

### 8.2. Chi tiet bo tu

File: `client/src/pages/TrangChiTietBo.jsx`

- Hien thong tin deck va tong so tu.
- Hien action hoc Flashcard, lam trac nghiem, lam Tu luan.
- Trac nghiem yeu cau it nhat 4 tu.
- Them/sua/xoa tu bang modal va confirm modal.
- Import nhanh nhieu tu qua textarea.
- Format import ho tro:
  - `word - meaning`
  - `word, meaning`
  - `word | meaning`
- Loc danh sach theo Tat ca / Yeu thich / Moi them.
- Toggle yeu thich tung tu, co persist vao localStorage.
- Thay doi card chi nam trong state cua trang, khong ghi nguoc vao backend.

### 8.3. Flashcard

File: `client/src/pages/TrangFlashcard.jsx`

- Hoc theo 2 chieu:
  - `vi-en`: Vietnamese -> English
  - `en-vi`: English -> Vietnamese
- Click hoac phim Space de lat the.
- ArrowRight/ArrowLeft de sang/lui the.
- Co progress bar theo vi tri card.
- Co cai dat:
  - Doi chieu hoc.
  - Chi hoc tu yeu thich.
  - Thu tu ngau nhien.
- Co empty state khi deck rong hoac loc favorite khong con tu.

### 8.4. Quiz trac nghiem

File: `client/src/pages/TrangQuiz.jsx`

- Tao cau hoi tu danh sach card trong component.
- Yeu cau it nhat 4 tu de co 1 dap an dung va 3 dap an nhieu.
- Hoc theo 2 chieu:
  - English -> Vietnamese
  - Vietnamese -> English
- Moi cau co 4 lua chon.
- Chon dap an xong khoa cau hoi, hien dung/sai, roi tu chuyen cau.
- Luu ket qua quiz vao localStorage khi hoan thanh.
- Co cai dat:
  - Doi chieu hoc.
  - Chi hoc tu yeu thich.
  - Thu tu ngau nhien.
  - Bat/tat reward.
  - Chinh moc so cau dung de kich hoat reward.
- Co combo display va reward progress.
- Phat audio `/sound/bigo.mp3` khi dung.

### 8.5. Quiz tu luan

File: `client/src/pages/TrangTuLuan.jsx`

- Nguoi dung go dap an vao input.
- So sanh dap an bang ham chuan hoa: trim, lowercase, gom khoang trang.
- Hoc theo 2 chieu:
  - Nghia -> Tu
  - Tu -> Nghia
- Dung thi tinh diem, tang combo, co reward progress.
- Sai thi shake input, reset combo, khong hien dap an ngay.
- Co nut Bo qua de hien dap an dung.
- Co cai dat:
  - Doi chieu hoc.
  - Chi tu yeu thich.
  - Thu tu ngau nhien.
  - Bat/tat reward.
  - Chinh moc reward.

### 8.6. Reward system

Files:

- `client/src/components/RewardTikTokEffect.jsx`
- `client/src/components/RewardTikTokEffect.css`
- `client/src/components/RewardMagicOverlay.jsx`
- `client/src/components/RewardMagicOverlay.css`
- `client/src/components/common/RewardProgressBar.jsx`
- `client/src/components/common/ComboDisplay.jsx`
- `client/src/hooks/useCombo.js`

Hanh vi:

- Reward kich hoat khi so cau dung dat moc.
- Config mac dinh trong `CAU_HINH_REWARD_QUIZ`.
- Manifest video: `/rewards/videos.json`.
- Video local: `client/public/rewards/video1.mp4` ... `video5.mp4`.
- Audio dung: `client/public/sound/bigo.mp3`.
- Overlay dung GSAP, canvas draw video, portal vao `document.body`.
- Co xu ly `prefers-reduced-motion`.
- Tren man hinh rong, reward co the hien hai ben; tren compact dung portal center/fallback.

---

## 9. Backend hien tai

Files:

- `server/src/server.js`
- `server/src/app.js`
- `server/src/config/db.js`
- `server/database/schema.sql`
- `server/database/seed.sql`

Routes dang co:

```txt
GET /api/health
GET /api/db-test
```

`/api/health` tra ve status server.

`/api/db-test` chay `SELECT 1 AS result` qua MySQL pool de kiem tra ket noi.

Chua co:

- `GET /api/decks`
- `GET /api/decks/:deckId`
- `POST /api/decks`
- `PUT /api/decks/:deckId`
- `DELETE /api/decks/:deckId`
- `GET /api/decks/:deckId/cards`
- `POST /api/decks/:deckId/cards`
- `PUT /api/cards/:cardId`
- `DELETE /api/cards/:cardId`

---

## 10. Database schema hien tai

`server/database/schema.sql` tao database va 2 bang:

```sql
CREATE TABLE IF NOT EXISTS decks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deck_id INT NOT NULL,
  term_en VARCHAR(255) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  example_sentence TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_deck
    FOREIGN KEY (deck_id)
    REFERENCES decks(id)
    ON DELETE CASCADE
);
```

Can can nhac them sau:

- `is_favorite` neu muon favorite persist trong DB.
- `card_progress` neu muon tien do tung tu.
- `quiz_results` neu muon lich su quiz.
- `users` va `user_id` sau MVP neu lam auth.

---

## 11. Huong dan chay project

### Frontend

```bash
cd client
npm install
npm run dev
```

Mac dinh Vite chay tai:

```txt
http://localhost:5173
```

Build:

```bash
cd client
npm run build
```

### Backend

```bash
cd server
npm install
npm run dev
```

Mac dinh server chay tai:

```txt
http://localhost:5000
```

Can file `.env` neu cau hinh DB khac mac dinh:

```txt
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=english_flashcard_quiz_app
```

---

## 12. Nguyen tac phat trien tiep

1. Frontend da la luong san pham chinh; khong rewrite UI neu khong can.
2. Khi them backend CRUD, giu shape field tuong thich mock data: `id`, `deck_id`, `term_en`, `meaning_vi`, `example_sentence`, `note`, `created_at`, `updated_at`.
3. Tach API client vao `client/src/services/` khi bat dau ket noi backend.
4. Khong them auth truoc khi decks/cards persist on dinh.
5. Khong chuyen sang TypeScript, Next.js, ORM hoac database khac neu chua duoc yeu cau.
6. Reward la lop trai nghiem phu; khong de reward lam hong flow quiz.
7. Moi thay doi lon trong quiz/reward phai test ca desktop va mobile vi CSS/animation phuc tap.
8. Giu code de doc, uu tien component/hook san co hon abstraction moi.
9. Khong commit `node_modules`, `.env`, file media ban quyen tu internet.
10. Khi sua code, doc file lien quan va `git status --short` truoc de tranh ghi de thay doi chua commit.

---

## 13. Uu tien phat trien tiep

### Lua chon A: Persist data bang backend/MySQL

Nen lam neu muc tieu tiep theo la MVP that:

1. Tao routes/controllers cho decks.
2. Tao routes/controllers cho cards.
3. Tao `client/src/services/api.js`, `deckApi.js`, `cardApi.js`.
4. Chuyen `TrangDanhSachBo` sang lay decks tu API.
5. Chuyen `TrangChiTietBo` sang lay cards tu API.
6. Them loading/error states.
7. Dam bao refresh khong mat deck/card.

### Lua chon B: Hoan thien frontend polish

Nen lam neu muc tieu tiep theo la demo/portfolio:

1. Kiem tra responsive cac trang hoc.
2. Don lai UI copy Anh/Viet cho dong nhat.
3. Hoan thien summary cua flashcard va tu luan.
4. Kiem tra reduced-motion va keyboard accessibility.
5. Chup screenshot/demo.

---

## 14. Prompt mau cho AI code assistant

```txt
Read PROJECT_CONTEXT.md first.

This project is mostly complete on the frontend mock side. The current app uses React/Vite with mock data in client/src/data/duLieuMau.js, localStorage for progress/favorites, and an Express/MySQL backend scaffold that does not yet expose CRUD APIs.

Do not rewrite the frontend unless required.
Do not change unrelated files.
Preserve the current Vietnamese naming style where it already exists.
Before editing, inspect the relevant files and git status.
After editing, summarize what changed and how to test.
```

Prompt ket noi backend:

```txt
Read PROJECT_CONTEXT.md first.

Implement backend persistence for decks/cards with Express + mysql2, then connect the existing React pages to those APIs.

Requirements:
- Keep the current field names compatible with mock data.
- Add routes/controllers/services only as needed.
- Keep auth out of scope.
- Preserve existing quiz/flashcard/reward behavior.
- Add loading/error handling in frontend.
- Provide manual test steps.
```

---

## 15. Ghi chu encode

File nay dung tieng Viet khong dau phan lon de tranh loi encoding trong terminal Windows. UI source code van co the dung tieng Viet co dau khi can hien thi cho nguoi dung.

---

## 16. Frontend context chi tiet de thiet ke database

Muc nay duoc cap nhat sau khi doc source frontend trong `client/`. Dung muc nay lam nguon context rieng cho AI khi can thiet ke database/API, tranh suy luan sai tu UI mock.

### 16.1. Tong quan frontend hien tai

- App la React/Vite SPA, route bang `react-router-dom`.
- Chua co API service layer. `axios` da cai trong `client/package.json` nhung chua duoc dung trong flow chinh.
- Data chinh den tu `client/src/data/duLieuMau.js`.
- State them/sua/xoa/import deck/card dang nam trong component state, refresh la mat.
- Favorite card va quiz progress dang persist bang `localStorage`.
- UI text trong nhieu file dang bi mojibake/loi encoding khi doc terminal, vi du chu Viet hien thanh `Bá»™`, `ÄÃ£`. Khi sua UI can giu/khac phuc encoding co chu dich, khong sua lan man trong task backend/database.

### 16.2. Routes va man hinh

Routes trong `client/src/App.jsx`:

```txt
/                         TrangChu
/decks                    TrangDanhSachBo
/decks/:deckId            TrangChiTietBo
/decks/:deckId/add-word   TrangThemTu
/decks/:deckId/flashcard  TrangFlashcard
/decks/:deckId/quiz       TrangQuiz
/decks/:deckId/tu-luan    TrangTuLuan
```

`BoCuc.jsx` la layout chung. Trang chu co layout rieng. Cac route hoc `flashcard`, `quiz`, `tu-luan` dung shell rieng de vua viewport.

### 16.3. Entity frontend dang su dung

#### Deck

Shape dang dung:

```js
{
  id,
  title,
  description,
  created_at,
  updated_at,
  streak,
  masteredCount
}
```

Trong do:

- `id`: number.
- `title`: ten bo tu.
- `description`: mo ta ngan, co the rong.
- `streak`: hien thi tren danh sach/chi tiet, hien chi la placeholder mock.
- `masteredCount`: placeholder mock, chua thay dung ro trong UI chinh.

Frontend actions can backend sau nay:

- Lay danh sach deck.
- Tao deck.
- Sua `title`, `description`.
- Tinh so card theo deck.
- Lay quiz progress gan nhat theo deck de hien badge `correct/total`.

#### Card

Shape dang dung:

```js
{
  id,
  deck_id,
  term_en,
  meaning_vi,
  example_sentence,
  note,
  created_at,
  updated_at,
  is_favorite,
  isFavorite
}
```

Trong do:

- `term_en` va `meaning_vi` la 2 field bat buoc trong UI.
- `example_sentence` hien trong danh sach tu va mat sau flashcard neu co.
- `note` co trong mock/form rieng `TrangThemTu`, nhung modal them/sua trong `TrangChiTietBo` hien tai chua expose note.
- `is_favorite` la field chinh trong mock; `isFavorite` duoc gan them de tuong thich khi toggle.
- `created_at` duoc dung de loc "Moi them" trong 3 ngay gan nhat.

Frontend actions can backend sau nay:

- Lay cards theo `deck_id`, sap xep tu moi truoc.
- Tao card mot le.
- Sua card.
- Xoa card.
- Import nhieu card trong mot request hoac loop nhieu request.
- Toggle favorite.
- Loc favorite/new co the lam client-side luc dau, nhung DB nen co field phu hop.

### 16.4. localStorage hien tai

`client/src/utils/tienDoHocTap.js`:

- Key progress: `hoc_tu_vung_progress`
- Shape theo deck id:

```js
{
  [deckId]: {
    flashcard: {
      remembered,
      review,
      total,
      lastStudiedAt
    },
    quiz: {
      correct,
      review,
      total,
      lastQuizAt
    },
    lastActivityAt
  }
}
```

`client/src/data/duLieuMau.js`:

- Key favorite: `hocTA.cardFavorites`
- Shape:

```js
{
  [cardId]: true
}
```

Database nen thay the dan 2 localStorage key nay khi lam persist:

- Favorite nen gan theo user/card neu co auth, hoac theo card neu MVP single-user.
- Quiz/learning progress nen co bang rieng neu muon lich su/analytics, hoac field aggregate neu chi can badge gan nhat.

### 16.5. Flow danh sach deck

File: `client/src/pages/TrangDanhSachBo.jsx`

- Khoi tao `danhSachDeck` tu `danhSachBo`.
- Them deck moi bang modal voi form `{ name, description }`.
- Sua deck bang modal, update `title`, `description`, `updated_at`.
- Khong co xoa deck trong UI hien tai.
- Moi deck card hien:
  - title
  - description
  - streak neu > 0
  - so tu, tinh bang `layTheoBoId(bo.id).length`
  - quiz gan nhat tu `layTienDoDeck(bo.id)`

Implication database/API:

- `GET /decks` nen tra them `card_count` va optional `latest_quiz_result`.
- `POST /decks` nhan `title`, `description`.
- `PUT/PATCH /decks/:id` nhan `title`, `description`.

### 16.6. Flow chi tiet deck va quan ly card

File: `client/src/pages/TrangChiTietBo.jsx`

- Lay deck bang `layBoTheoId(boId)`.
- Lay cards bang `layTheoBoId(boId)`.
- Hien stats:
  - tong so tu
  - streak
- Action hoc:
  - Flashcard: luon cho vao neu co route.
  - Quiz trac nghiem: can it nhat 4 tu.
  - Tu luan: co route rieng.
- Quan ly card trong modal:
  - Them card: `word`, `meaning`, `example`.
  - Sua card: `word`, `meaning`, `example`.
  - Xoa card: confirm modal.
  - Toggle favorite.
- Import nhieu dong:
  - Ho tro `word - meaning`
  - Ho tro `word, meaning`
  - Ho tro `word | meaning`
  - Card import co `example_sentence: ""`, `note: ""`, `is_favorite: false`.
- Filter local:
  - `tat-ca`
  - `yeu-thich`
  - `moi-them`

Implication database/API:

- Cards can unique constraint can can nhac: co nen unique `(deck_id, term_en)` hay cho duplicate.
- Can endpoint import batch neu muon UX tot.
- Can `created_at` chinh xac de filter "moi them".
- Favorite nen persist vi UI co filter theo favorite.

### 16.7. Flow flashcard

File: `client/src/pages/TrangFlashcard.jsx`

- Dung cards cua deck, co the filter favorite.
- Hai chieu hoc:
  - `vi-en`: mat truoc `meaning_vi`, mat sau `term_en`.
  - `en-vi`: mat truoc `term_en`, mat sau `meaning_vi`.
- Setting trong popover:
  - doi chieu hoc
  - chi hoc tu yeu thich
  - random order
- Keyboard:
  - Space lat the
  - ArrowRight/ArrowLeft di chuyen
- Hien progress theo vi tri card.
- Chua thay luu flashcard progress trong component hien tai du helper `luuTienDoFlashcard` da co.

Implication database:

- Neu can tracking flashcard sau nay, can session/progress rieng: cards da xem, remembered/review.
- Phase persist deck/card co the bo qua flashcard tracking truoc.

### 16.8. Flow quiz trac nghiem

File: `client/src/pages/TrangQuiz.jsx`

- Can it nhat 4 card sau khi filter.
- Sinh cau hoi client-side tu cards.
- Hai chieu:
  - `en-vi`: cau hoi `term_en`, dap an `meaning_vi`.
  - `vi-en`: cau hoi `meaning_vi`, dap an `term_en`.
- Moi cau co 4 lua chon: 1 dung + 3 nhieu tu cards khac.
- Khi chon dap an:
  - Khoa cau hien tai.
  - Dung: tang `soCauDung`, tang combo, phat `/sound/bigo.mp3`, cap nhat reward progress.
  - Sai: reset combo, hien dap an dung.
- Khi hoan thanh:
  - Goi `luuTienDoQuiz(deckId, { correct, review, total })`.
- Settings:
  - direction
  - chi hoc favorite
  - random
  - bat/tat reward
  - moc reward, default tu `CAU_HINH_REWARD_QUIZ.triggerCount`

Implication database:

- Nen co bang/shape luu quiz result aggregate:
  - `deck_id`
  - `mode`/`direction`
  - `question_type` = `multiple_choice`
  - `total`
  - `correct`
  - `review` hoac computed `total - correct`
  - `created_at`
- Neu muon chi tiet cau sai/dung, can bang answer details theo card.

### 16.9. Flow quiz tu luan

File: `client/src/pages/TrangTuLuan.jsx`

- Dung cards cua deck, co filter favorite va random.
- Hai chieu:
  - `vi-en`: cau hoi `meaning_vi`, dap an `term_en`.
  - `en-vi`: cau hoi `term_en`, dap an `meaning_vi`.
- Check dap an bang normalize: trim, lowercase, gom khoang trang.
- Sai:
  - reset combo
  - shake input
  - khong hien dap an dung ngay neu chua bam bo qua
- Bo qua:
  - hien dap an dung
  - van cho nhap lai/kiem tra tiep
- Dung:
  - tang score
  - tang combo
  - reward progress
- Co `danhSachKetQua` trong state voi shape:

```js
{
  id,
  cauHoi,
  dapAnDung,
  cauTraLoi,
  dung
}
```

Hien tai `TrangTuLuan` chua luu progress vao localStorage khi hoan thanh.

Implication database:

- Neu luu lich su tu luan, dung chung bang result voi `question_type = written`.
- Neu luu chi tiet, can answer detail co `card_id`, `prompt`, `expected_answer`, `user_answer`, `is_correct`.

### 16.10. Reward/combo system

Files:

- `RewardTikTokEffect.jsx`
- `RewardMagicOverlay.jsx`
- `RewardProgressBar.jsx`
- `ComboDisplay.jsx`
- `useCombo.js`

Hanh vi:

- Reward chi la UI effect client-side, khong yeu cau DB cho MVP persist deck/card.
- Config default:

```js
{
  triggerCount: 2,
  opacity: 0.78,
  duration: 10800,
  videoDuration: 8000,
  fadeOutMs: 1000,
  volume: 0.80,
  manifestSrc: "/rewards/videos.json"
}
```

- Manifest reward: `client/public/rewards/videos.json`.
- Video local: `video1.mp4` den `video5.mp4`.
- Audio dung: `client/public/sound/bigo.mp3`.
- Co reduced-motion handling.

Implication database:

- Khong can luu reward media/config trong database o MVP.
- Neu sau nay can personalization, co the luu user settings: reward enabled, reward trigger count.

### 16.11. Settings frontend dang la session state

Nhung setting sau dang reset khi reload/vao lai trang:

- Direction flashcard/quiz/tu-luan.
- Chi hoc favorite.
- Random order.
- Reward enabled.
- Reward trigger count.

Database khong bat buoc luu cac setting nay cho MVP. Neu co users/auth sau nay, co the them bang `user_settings` hoac JSON settings theo user.

### 16.12. Database implications uu tien

Uu tien nen thiet ke theo tung muc:

1. MVP persist deck/card:
   - `decks`
   - `cards`
   - optional `is_favorite` tren `cards` neu single-user.
2. MVP progress gan nhat:
   - `study_results` hoac `quiz_results` de thay localStorage `hoc_tu_vung_progress`.
3. Sau khi co auth:
   - `users`
   - deck ownership `user_id`
   - favorite tach bang `user_card_favorites`
   - progress/results gan `user_id`.
4. Neu can analytics chi tiet:
   - `study_sessions`
   - `study_answers`
   - card-level stats: attempts, correct_count, wrong_count, last_seen_at, mastery_level.

### 16.13. API shape nen tuong thich frontend

De ket noi frontend it sua nhat, backend nen tra field snake_case giong mock hien tai:

Deck response:

```js
{
  id,
  title,
  description,
  created_at,
  updated_at,
  card_count,
  streak,
  masteredCount,
  latest_quiz
}
```

Card response:

```js
{
  id,
  deck_id,
  term_en,
  meaning_vi,
  example_sentence,
  note,
  is_favorite,
  created_at,
  updated_at
}
```

Quiz result response/request:

```js
{
  deck_id,
  mode,
  question_type,
  direction,
  correct,
  review,
  total,
  created_at
}
```

### 16.14. Luu y khi AI tiep tuc code

- Khong rewrite frontend khi thiet ke database/API.
- Khi ket noi API, tao service layer moi trong `client/src/services/`.
- Giu field names tuong thich mock data de giam sua UI.
- Can doc diff truoc khi sua cac file frontend vi hien worktree co nhieu file frontend modified.
- Khong dua reward media vao database.
- Khong thiet ke auth phuc tap truoc khi persist decks/cards on dinh.
