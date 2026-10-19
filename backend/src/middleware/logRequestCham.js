/**
 * Ghi log Cloud Run (severity WARNING, message "slow_request") cho request thường mất ≥ 800 ms,
 * để thấy API chậm thật trên production (Cloud SQL, cold start). Bỏ qua các API gọi AI / phát
 * audio / luồng chữ vốn lâu. Xem: gcloud logging read 'jsonPayload.message="slow_request"'
 */
const NGUONG_MS = 800;
const BO_QUA = /\/(explain|prepare|chat|generate-words|generate-examples|check-sentence|audio)(\/|$|\?)|^\/api\/cron\//;

function logRequestCham(req, res, next) {
  const batDau = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - batDau) / 1e6;
    const duongDan = req.originalUrl.split("?")[0];
    if (ms < NGUONG_MS || BO_QUA.test(duongDan)) return;
    console.warn(
      JSON.stringify({
        severity: "WARNING",
        message: "slow_request",
        method: req.method,
        path: duongDan,
        status: res.statusCode,
        ms: Math.round(ms),
      })
    );
  });
  next();
}

module.exports = { logRequestCham, NGUONG_MS };
