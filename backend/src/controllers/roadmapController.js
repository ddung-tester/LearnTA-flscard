const pool = require("../config/db");
const { cleanText, createHttpError } = require("../utils/http");
const { currentUserId } = require("./deckController");

// Lộ trình học: chuỗi bộ từ mẫu theo thứ tự, kèm tiến độ của người học (nếu đã đăng nhập).
// Tiến độ đọc từ card_progress: "đã học" = có tiến độ, "đã thuộc" = Lv5.

const SLUG_HOP_LE = /^[a-z0-9-]{1,80}$/;
// Chỉ lấy bộ từ mà ai cũng đọc được, phòng khi lộ trình bị gắn nhầm bộ từ riêng tư
const BO_TU_CONG_KHAI = "(d.user_id IS NULL OR d.is_public = TRUE)";

function soNguyen(value) {
  return Number(value || 0);
}

function normalizeRoadmap(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || "",
    level_label: row.level_label || null,
  };
}

function normalizeTienDo(row) {
  return {
    word_count: soNguyen(row.word_count),
    learned_count: soNguyen(row.learned_count),
    mastered_count: soNguyen(row.mastered_count),
  };
}

async function listRoadmaps(req, res) {
  const userId = currentUserId(req);
  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.slug,
       r.title,
       r.description,
       r.level_label,
       COUNT(DISTINCT d.id) AS deck_count,
       COUNT(c.id) AS word_count,
       COALESCE(SUM(cp.id IS NOT NULL), 0) AS learned_count,
       COALESCE(SUM(cp.mastery_level >= 5), 0) AS mastered_count
     FROM roadmaps r
     LEFT JOIN roadmap_decks rd ON rd.roadmap_id = r.id
     LEFT JOIN decks d ON d.id = rd.deck_id AND ${BO_TU_CONG_KHAI}
     LEFT JOIN cards c ON c.deck_id = d.id
     LEFT JOIN card_progress cp ON cp.card_id = c.id AND cp.user_id = ?
     GROUP BY r.id
     ORDER BY r.sort_order ASC, r.id ASC`,
    [userId]
  );

  res.json(
    rows.map((row) => ({
      ...normalizeRoadmap(row),
      deck_count: soNguyen(row.deck_count),
      ...normalizeTienDo(row),
    }))
  );
}

async function getRoadmap(req, res) {
  const slug = cleanText(req.params.slug);
  if (!SLUG_HOP_LE.test(slug)) {
    throw createHttpError(404, "Khong tim thay lo trinh");
  }

  const [roadmaps] = await pool.query(
    `SELECT id, slug, title, description, level_label
     FROM roadmaps
     WHERE slug = ?
     LIMIT 1`,
    [slug]
  );
  const roadmap = roadmaps[0];
  if (!roadmap) {
    throw createHttpError(404, "Khong tim thay lo trinh");
  }

  const userId = currentUserId(req);
  const [decks] = await pool.query(
    `SELECT
       d.id,
       d.title,
       d.description,
       COUNT(c.id) AS word_count,
       COALESCE(SUM(cp.id IS NOT NULL), 0) AS learned_count,
       COALESCE(SUM(cp.mastery_level >= 5), 0) AS mastered_count,
       COALESCE(SUM(cp.next_review_at <= CURRENT_TIMESTAMP), 0) AS due_count
     FROM roadmap_decks rd
     JOIN decks d ON d.id = rd.deck_id
     LEFT JOIN cards c ON c.deck_id = d.id
     LEFT JOIN card_progress cp ON cp.card_id = c.id AND cp.user_id = ?
     WHERE rd.roadmap_id = ? AND ${BO_TU_CONG_KHAI}
     GROUP BY d.id, rd.sort_order
     ORDER BY rd.sort_order ASC, d.id ASC`,
    [userId, roadmap.id]
  );

  res.json({
    ...normalizeRoadmap(roadmap),
    decks: decks.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || "",
      ...normalizeTienDo(row),
      due_count: soNguyen(row.due_count),
    })),
  });
}

module.exports = {
  listRoadmaps,
  getRoadmap,
};
