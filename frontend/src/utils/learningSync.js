import { dongBoTuSaiLenBackend } from "./mistakeNotebook";
import { dongBoSRSLenBackend } from "./srsReview";

let syncPromise = null;

export async function dongBoDuLieuHocTapLenBackend() {
  if (syncPromise) return syncPromise;

  syncPromise = Promise.allSettled([
    dongBoTuSaiLenBackend(),
    dongBoSRSLenBackend(),
  ])
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      syncPromise = null;
    });

  return syncPromise;
}
