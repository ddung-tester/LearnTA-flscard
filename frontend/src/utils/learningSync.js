import { dongBoKetQuaCho } from "../services/studyApi";
import { dongBoTuSaiLenBackend } from "./mistakeNotebook";
import { dongBoSRSLenBackend } from "./srsReview";

import { layPhienKhoHocTap, laPhienKhoHienTai } from "./khoHocTap";

let syncPromise = null;
let syncOwner = null;

export async function dongBoDuLieuHocTapLenBackend() {
  const owner = layPhienKhoHocTap();
  if (syncPromise && syncOwner === owner) return syncPromise;
  syncOwner = owner;

  syncPromise = Promise.allSettled([
    dongBoTuSaiLenBackend(),
    dongBoKetQuaCho(),
  ])
    .then(async () => {
      if (!laPhienKhoHienTai(owner)) return false;
      await dongBoSRSLenBackend();
      return true;
    })
    .catch(() => false)
    .finally(() => {
      if (syncOwner === owner) syncPromise = null;
    });

  return syncPromise;
}
