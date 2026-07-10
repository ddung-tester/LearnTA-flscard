/**
 * streakService.js — Cập nhật streak cho user và deck.
 *
 * Timezone: Vietnam (UTC+7).
 * Gọi trong transaction của finishStudySession / createQuizResult.
 */

/**
 * Lấy ngày hôm nay theo giờ Việt Nam (UTC+7), dạng 'YYYY-MM-DD'.
 */
function getTodayVN() {
  const now = new Date();
  // Offset Vietnam +7h so với UTC
  const vnMs = now.getTime() + 7 * 60 * 60 * 1000;
  return new Date(vnMs).toISOString().slice(0, 10);
}

/**
 * Lấy ngày hôm qua theo giờ Việt Nam, dạng 'YYYY-MM-DD'.
 */
function getYesterdayVN() {
  const now = new Date();
  const vnMs = now.getTime() + 7 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000;
  return new Date(vnMs).toISOString().slice(0, 10);
}

/**
 * Cập nhật current_streak, longest_streak, last_study_date của user.
 * Upsert streak_logs cho ngày hôm nay.
 *
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} userId
 * @param {{ xpEarned?: number, cardsReviewed?: number }} opts
 * @returns {{ newStreak: number, newLongest: number, today: string }}
 */
async function updateUserStreak(connection, userId, { xpEarned = 0, cardsReviewed = 0 } = {}) {
  if (!userId) return null;

  const today = getTodayVN();
  const yesterday = getYesterdayVN();

  const [rows] = await connection.query(
    `SELECT current_streak, longest_streak, last_study_date
     FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
    [userId]
  );

  const user = rows[0];
  if (!user) return null;

  const lastDate = user.last_study_date
    ? new Date(user.last_study_date).toISOString().slice(0, 10)
    : null;

  let newStreak;
  if (lastDate === today) {
    // Đã học hôm nay rồi — chỉ cộng dồn log, không thay đổi streak
    newStreak = user.current_streak;
  } else if (lastDate === yesterday) {
    // Liên tiếp — tăng streak
    newStreak = (user.current_streak || 0) + 1;
  } else {
    // Gián đoạn hoặc lần đầu — reset
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, user.longest_streak || 0);

  await connection.execute(
    `UPDATE users
     SET current_streak = ?,
         longest_streak = ?,
         last_study_date = ?,
         total_xp = total_xp + ?
     WHERE id = ?`,
    [newStreak, newLongest, today, xpEarned, userId]
  );

  // Upsert streak_logs — cộng dồn nếu đã có record hôm nay
  await connection.execute(
    `INSERT INTO streak_logs (user_id, study_date, xp_earned, cards_reviewed)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       xp_earned      = xp_earned + VALUES(xp_earned),
       cards_reviewed = cards_reviewed + VALUES(cards_reviewed)`,
    [userId, today, xpEarned, cardsReviewed]
  );

  return { newStreak, newLongest, today };
}

/**
 * Cập nhật streak của deck (chỉ cho deck thuộc sở hữu của user).
 *
 * Logic: xem study_sessions có session nào kết thúc "hôm qua" không →
 *   có → streak hiện tại + 1
 *   không (hoặc lần đầu) → reset về 1
 *   nếu đã có session hôm nay → giữ nguyên
 *
 * @param {import('mysql2/promise').Connection} connection
 * @param {number} deckId
 * @param {number} userId
 */
async function updateDeckStreak(connection, deckId, userId) {
  if (!deckId || !userId) return;

  const today = getTodayVN();
  const yesterday = getYesterdayVN();

  // Chỉ update streak cho deck của chính user
  const [deckRows] = await connection.query(
    `SELECT streak, user_id FROM decks WHERE id = ? LIMIT 1`,
    [deckId]
  );
  const deck = deckRows[0];

  if (!deck || String(deck.user_id) !== String(userId)) {
    // Không phải deck riêng của user → bỏ qua
    return;
  }

  // Xem ngày gần nhất đã học deck này (không tính hôm nay)
  const [sessionRows] = await connection.query(
    `SELECT MAX(DATE(CONVERT_TZ(ended_at, '+00:00', '+07:00'))) AS last_date
     FROM study_sessions
     WHERE deck_id = ? AND user_id = ?
       AND ended_at IS NOT NULL
       AND DATE(CONVERT_TZ(ended_at, '+00:00', '+07:00')) != ?`,
    [deckId, userId, today]
  );
  const lastDate = sessionRows[0]?.last_date
    ? new Date(sessionRows[0].last_date).toISOString().slice(0, 10)
    : null;

  // Kiểm tra xem hôm nay đã có session cho deck này chưa (streak đã được tính)
  const [todayRows] = await connection.query(
    `SELECT COUNT(*) AS cnt
     FROM study_sessions
     WHERE deck_id = ? AND user_id = ?
       AND ended_at IS NOT NULL
       AND DATE(CONVERT_TZ(ended_at, '+00:00', '+07:00')) = ?`,
    [deckId, userId, today]
  );
  // Nếu hôm nay đã có session (và hàm này được gọi lần thứ 2+), không tính lại
  // (todayRows[0].cnt > 1 vì session hiện tại cũng bị tính)
  if (Number(todayRows[0]?.cnt) > 1) {
    return; // Đã cập nhật streak hôm nay rồi
  }

  let newStreak;
  if (lastDate === yesterday) {
    newStreak = (deck.streak || 0) + 1;
  } else {
    // Gián đoạn hoặc lần đầu
    newStreak = 1;
  }

  await connection.execute(
    `UPDATE decks SET streak = ? WHERE id = ?`,
    [newStreak, deckId]
  );
}

module.exports = { updateUserStreak, updateDeckStreak, getTodayVN };
