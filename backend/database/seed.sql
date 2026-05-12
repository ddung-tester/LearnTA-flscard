USE english_flashcard_quiz_app;

-- =========================
-- USERS
-- =========================

INSERT INTO users (
  username,
  email,
  password_hash,
  total_xp,
  current_streak,
  longest_streak
)
VALUES
(
  'demo_user',
  'demo@example.com',
  '$2b$10$demo_hash_change_later',
  320,
  5,
  12
);

-- =========================
-- DECKS
-- =========================

INSERT INTO decks (
  user_id,
  title,
  description,
  icon,
  theme_color,
  streak,
  mastered_count
)
VALUES
(
  1,
  'Frontend Basics',
  'HTML CSS JavaScript React',
  'code',
  'blue',
  4,
  8
),
(
  1,
  'Backend & API',
  'Node.js Express REST API',
  'server',
  'purple',
  2,
  5
),
(
  1,
  'Computer Science',
  'Core CS vocabulary',
  'cpu',
  'orange',
  7,
  11
);

-- =========================
-- CARDS
-- =========================

INSERT INTO cards (
  deck_id,
  term_en,
  meaning_vi,
  example_sentence,
  note,
  is_favorite
)
VALUES

-- Frontend Basics
(1, 'component', 'thanh phan giao dien', 'React app is built from components.', '', true),
(1, 'state', 'trang thai', 'State controls UI updates.', '', true),
(1, 'props', 'thuoc tinh component', 'Props are passed from parent to child.', '', false),
(1, 'hook', 'react hook', 'useEffect is a common hook.', '', true),
(1, 'render', 'ket xuat giao dien', 'React re-rendered the component.', '', false),
(1, 'virtual dom', 'dom ao', 'Virtual DOM improves performance.', '', false),
(1, 'responsive', 'tuong thich da man hinh', 'Responsive design works on mobile.', '', true),
(1, 'animation', 'hieu ung chuyen dong', 'The button animation feels smooth.', '', true),

-- Backend & API
(2, 'server', 'may chu', 'The server handles API requests.', '', true),
(2, 'endpoint', 'duong dan api', 'This endpoint returns user data.', '', false),
(2, 'database', 'co so du lieu', 'MySQL is a relational database.', '', true),
(2, 'middleware', 'middleware', 'Middleware runs before controllers.', '', false),
(2, 'authentication', 'xac thuc', 'JWT is used for authentication.', '', true),
(2, 'authorization', 'phan quyen', 'Authorization checks permissions.', '', false),
(2, 'query', 'truy van', 'The SQL query was optimized.', '', false),
(2, 'response', 'phan hoi', 'The API response contains JSON.', '', false),

-- Computer Science
(3, 'algorithm', 'thuat toan', 'Sorting is a common algorithm topic.', '', true),
(3, 'recursion', 'de quy', 'Recursion calls itself repeatedly.', '', true),
(3, 'compiler', 'trinh bien dich', 'The compiler converts code to machine language.', '', false),
(3, 'cache', 'bo nho dem', 'Cache improves loading speed.', '', true),
(3, 'binary tree', 'cay nhi phan', 'Binary trees are data structures.', '', false),
(3, 'queue', 'hang doi', 'A queue uses FIFO.', '', false),
(3, 'stack', 'ngan xep', 'Stack uses LIFO.', '', false),
(3, 'closure', 'closure', 'JavaScript closures are powerful.', '', true);

-- =========================
-- QUIZ RESULTS
-- =========================

INSERT INTO quiz_results (
  user_id,
  deck_id,
  question_type,
  direction,
  correct,
  review,
  total
)
VALUES
(1, 1, 'multiple_choice', 'en-vi', 8, 2, 10),
(1, 2, 'multiple_choice', 'vi-en', 6, 4, 10),
(1, 3, 'written', 'en-vi', 7, 3, 10);

-- =========================
-- USER SETTINGS
-- =========================

INSERT INTO user_settings (
  user_id,
  default_direction,
  only_favorite,
  random_order,
  reward_enabled,
  reward_trigger_count
)
VALUES
(
  1,
  'en-vi',
  false,
  true,
  true,
  2
);
