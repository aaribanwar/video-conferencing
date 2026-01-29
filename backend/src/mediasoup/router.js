// src/mediasoup/router.js

import { mediaCodecs } from "./config.js";
import { getMediasoupWorker } from "./worker.js";

let router;

export async function createMediasoupRouter() {
  if (router) {
    throw new Error("mediasoup Router already exists");
  }

  const worker = getMediasoupWorker();

  try {
    router = await worker.createRouter({ mediaCodecs });
    return router;
  } catch (err) {
    console.error("Failed to create mediasoup Router", err);
    throw err;
  }
}

export function getMediasoupRouter() {
  if (!router) {
    throw new Error("mediasoup Router not initialized");
  }
  return router;
}

export function getRtpCapabilities() {
  if (!router) {
    throw new Error("mediasoup Router not initialized");
  }
  return router.rtpCapabilities;
}
