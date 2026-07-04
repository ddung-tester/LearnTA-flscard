/**
 * reminderService.js — Gửi email nhắc học & khen ngợi qua Gmail SMTP (Nodemailer).
 *
 * sendDailyReminders()  — 23:00 VN — Gửi cho user CHƯA học hôm nay
 * sendPraiseEmails()    — 18:00 VN — Gửi cho user ĐÃ học hôm nay
 */

const nodemailer = require("nodemailer");
const pool = require("../config/db");
const { getTodayVN } = require("./streakService");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;
    if (!user || !pass) return null;
    transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
  return transporter;
}

const GMAIL_USER = () => process.env.GMAIL_USER || "";
const APP_URL = "https://dungdinh-vocab.vercel.app/decks";

// ─── Email nhắc học (23:00 VN) ────────────────────────────────────────────────

const REMINDER_TEMPLATES = [
  {
    subject: "🔥 Ơi, hôm nay bạn chưa học!",
    headline: "Streak đang chờ bạn giải cứu...",
    body: `Chỉ <strong>5 phút thôi</strong>. Mở app, lật vài thẻ — xong rồi ngủ ngon. Đừng để hôm nay là ngày bạn nhớ mãi vì đã bỏ lỡ. 🔥`,
  },
  {
    subject: "⏰ Ngày sắp hết — bạn chưa học gì!",
    headline: "Còn kịp. Thật sự còn kịp.",
    body: `Không cần nhiều. <strong>3 từ vựng</strong> cũng đủ để hôm nay được tính. Bắt đầu đi — não bạn đang sẵn sàng hơn bạn nghĩ. 💡`,
  },
  {
    subject: "😤 Hôm nay chưa học — hối tiếc không?",
    headline: "Đừng để 'hôm nay' thành 'thôi ngày mai'",
    body: `Câu đó bạn đã tự nói bao nhiêu lần rồi? <strong>Mở LearnTA ngay bây giờ</strong> — chỉ cần bắt đầu, phần còn lại tự chạy. ⚡`,
  },
  {
    subject: "🫵 Bạn ơi — streak cần bạn tối nay!",
    headline: "1 ngày bỏ. 7 ngày tiếc.",
    body: `Bạn đã xây được bao nhiêu ngày rồi — đừng để tất cả sụp đổ vì <strong>một tối lười biếng</strong>. Học đi, tôi tin bạn! 💪`,
  },
  {
    subject: "🌙 Trước khi ngủ — học vài từ đi!",
    headline: "Buổi tối: não nhớ giỏi nhất",
    body: `Không cần nhiều. <strong>5 phút trước khi tắt đèn</strong> — sáng mai thức dậy bạn sẽ ngạc nhiên vì mình nhớ tốt đến vậy. 🧠`,
  },
  {
    subject: "💔 Streak của bạn đang cầu cứu!",
    headline: "Đừng bỏ nó một mình tối nay",
    body: `Streak chỉ cần <strong>bạn ghé qua một lần</strong> mỗi ngày. Hôm nay bạn chưa ghé. Còn kịp đấy! 🥺`,
  },
  {
    subject: "🚀 Người giỏi tiếng Anh làm gì tối nay?",
    headline: "Họ học. Dù chỉ 5 phút.",
    body: `Không phải vì họ có nhiều thời gian. Họ chỉ <strong>bắt đầu khi chưa muốn</strong> — và đó là tất cả sự khác biệt. Bạn thì sao? 🎯`,
  },
];

// ─── Email khen/động viên (18:00 VN) ─────────────────────────────────────────

const PRAISE_TEMPLATES = [
  {
    subject: "🔥 Bạn đã học hôm nay — tôi tự hào!",
    headline: "Đỉnh. Thật sự đỉnh.",
    body: `Không phải ai cũng làm được điều bạn vừa làm hôm nay. <strong>Giữ streak, giữ thói quen, giữ chính mình.</strong> Ngày mai tiếp tục nhé! 🚀`,
  },
  {
    subject: "⭐ Hôm nay bạn đã thắng!",
    headline: "Chiến thắng nhỏ. Ý nghĩa lớn.",
    body: `Hôm nay bạn đã chọn <strong>tương lai tốt hơn</strong> thay vì sự tiện lợi trước mắt. Đó là lựa chọn đúng đắn nhất trong ngày. Tự hào đi! 🏆`,
  },
  {
    subject: "💚 Streak của bạn đang bùng cháy!",
    headline: "Đừng dừng — bạn đang có đà rồi!",
    body: `Khi đã có momentum thì đừng phá vỡ. Bạn đã học hôm nay — <strong>ngày mai chỉ cần làm lại đúng vậy</strong>. Đơn giản thôi! 🔥`,
  },
  {
    subject: "🎯 Mission complete! Bạn xịn thật!",
    headline: "Học rồi — giờ thư giãn xứng đáng!",
    body: `Bạn đã làm phần khó nhất: <strong>bắt đầu và hoàn thành</strong>. Hãy nghỉ ngơi và biết rằng hôm nay của bạn thật có ý nghĩa. 😊`,
  },
  {
    subject: "🌟 Bạn thuộc top 1% người học đều đặn!",
    headline: "Hiếm lắm đó — thật sự hiếm!",
    body: `Phần lớn mọi người bỏ cuộc sau vài ngày. Bạn thì không. <strong>Đó là điều làm bạn khác biệt</strong> — và kết quả sẽ đến theo thời gian. Tin tôi đi! 💫`,
  },
  {
    subject: "🥳 Hôm nay học xong — cảm giác thế nào?",
    headline: "Tốt hơn hôm qua một chút!",
    body: `Mỗi từ bạn học hôm nay sẽ ở lại mãi. <strong>Không ai lấy đi được kiến thức của bạn.</strong> Cứ học đi — đó là khoản đầu tư sinh lời nhất! 📈`,
  },
  {
    subject: "💪 Dù bận, dù mệt — bạn vẫn học!",
    headline: "Đó mới là kỷ luật thật sự.",
    body: `<strong>Sự kiên trì khi không có ai nhìn</strong> — đó là phẩm chất hiếm có. Bạn có nó. Và nó sẽ đưa bạn đến nơi bạn muốn. Cứ tiếp tục! 🎖️`,
  },
];

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildEmail({ displayName, subject, headline, body, streak, type = "reminder" }) {
  const isReminder = type === "reminder";
  const headerGradient = isReminder
    ? "linear-gradient(135deg,#92400e,#f97316)"
    : "linear-gradient(135deg,#065f46,#10b981)";
  const ctaGradient = isReminder
    ? "linear-gradient(135deg,#f97316,#dc2626)"
    : "linear-gradient(135deg,#059669,#0284c7)";
  const icon = isReminder ? "🔥" : "🌟";
  const ctaText = isReminder ? "Học ngay 🚀" : "Học thêm hôm nay 📚";

  const streakSection =
    streak > 0
      ? `<div style="text-align:center;margin:20px 0;">
          <div style="display:inline-block;background:${ctaGradient};padding:10px 24px;border-radius:999px;color:#fff;font-weight:700;font-size:15px;">
            🔥 Streak: ${streak} ngày
          </div>
         </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:${headerGradient};padding:28px 36px;text-align:center;">
              <div style="font-size:36px;margin-bottom:6px;">${icon}</div>
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${headline}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 36px;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#1e1b4b;">Chào ${displayName}! 👋</p>
              <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">${body}</p>
              ${streakSection}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;background:${ctaGradient};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 32px;border-radius:10px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 36px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                Bạn nhận email này vì đã bật nhắc nhở từ LearnTA.<br/>
                Tắt tại <strong>Cài đặt → Nhắc nhở email</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Chào ${displayName}!\n\n${headline}\n\n${body.replace(/<[^>]*>/g, "")}\n\n${ctaText}: ${APP_URL}`;
  return { html, text, subject };
}

// ─── sendDailyReminders — 23:00 VN — user CHƯA học hôm nay ───────────────────

async function sendDailyReminders() {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[reminderService] GMAIL chưa cấu hình → bỏ qua.");
    return { sent: 0, skipped: 0 };
  }

  const today = getTodayVN();
  const [users] = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.current_streak
     FROM users u
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.email IS NOT NULL
       AND (u.last_study_date IS NULL OR u.last_study_date < ?)
       AND (us.email_reminders IS NULL OR us.email_reminders = TRUE)`,
    [today]
  );

  let sent = 0, skipped = 0;
  for (const user of users) {
    try {
      const tpl = REMINDER_TEMPLATES[Math.floor(Math.random() * REMINDER_TEMPLATES.length)];
      const { html, text, subject } = buildEmail({
        displayName: user.fullname || "bạn",
        subject: tpl.subject,
        headline: tpl.headline,
        body: tpl.body,
        streak: user.current_streak || 0,
        type: "reminder",
      });
      await transport.sendMail({ from: `"LearnTA" <${GMAIL_USER()}>`, to: user.email, subject, html, text });
      sent++;
      console.info(`[reminderService] Reminder → ${user.email}`);
    } catch (err) {
      skipped++;
      console.error(`[reminderService] Failed → ${user.email}:`, err?.message);
    }
  }

  console.info(`[reminderService] Reminder done: ${sent} sent, ${skipped} failed / ${users.length} total`);
  return { sent, skipped, total: users.length };
}

// ─── sendPraiseEmails — 18:00 VN — user ĐÃ học hôm nay ──────────────────────

async function sendPraiseEmails() {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[reminderService] GMAIL chưa cấu hình → bỏ qua.");
    return { sent: 0, skipped: 0 };
  }

  const today = getTodayVN();
  const [users] = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.current_streak
     FROM users u
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.email IS NOT NULL
       AND u.last_study_date = ?
       AND (us.email_reminders IS NULL OR us.email_reminders = TRUE)`,
    [today]
  );

  let sent = 0, skipped = 0;
  for (const user of users) {
    try {
      const tpl = PRAISE_TEMPLATES[Math.floor(Math.random() * PRAISE_TEMPLATES.length)];
      const { html, text, subject } = buildEmail({
        displayName: user.fullname || "bạn",
        subject: tpl.subject,
        headline: tpl.headline,
        body: tpl.body,
        streak: user.current_streak || 0,
        type: "praise",
      });
      await transport.sendMail({ from: `"LearnTA" <${GMAIL_USER()}>`, to: user.email, subject, html, text });
      sent++;
      console.info(`[reminderService] Praise → ${user.email}`);
    } catch (err) {
      skipped++;
      console.error(`[reminderService] Praise failed → ${user.email}:`, err?.message);
    }
  }

  console.info(`[reminderService] Praise done: ${sent} sent, ${skipped} failed / ${users.length} total`);
  return { sent, skipped, total: users.length };
}

module.exports = { sendDailyReminders, sendPraiseEmails };
