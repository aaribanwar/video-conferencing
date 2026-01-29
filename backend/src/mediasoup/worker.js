
import { mediasoup, workerSettings } from "./config.js";

let worker;

export async function createMediasoupWorker() {
  if (worker) {
    throw new Error("mediasoup Worker already exists");
  }

  try {
    worker = await mediasoup.createWorker(workerSettings);

    worker.on("died", () => {
      console.error("mediasoup Worker died, exiting process");
      process.exit(1);
    });

    return worker;
  } catch (err) {
    console.error("Failed to create mediasoup Worker", err);
    throw err;
  }
}

export function getMediasoupWorker() {
  if (!worker) {
    throw new Error("mediasoup Worker not initialized");
  }
  return worker;
}
