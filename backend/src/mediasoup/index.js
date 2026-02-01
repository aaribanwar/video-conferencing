import { createMediasoupWorker } from "./worker.js";
import { createMediasoupRouter } from "./router.js";

export async function initMediasoup() {
  await createMediasoupWorker();
  await createMediasoupRouter();
}
