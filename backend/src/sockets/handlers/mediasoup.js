import {
  getMediasoupRouter,
  getRtpCapabilities
} from "../../mediasoup/router.js";
import { webRtcTransportOptions } from "../../mediasoup/config.js";

// ---- GLOBAL (v1) ----
// producerId -> producer
const producers = new Map();

export function registerMediasoupHandlers(socket) {
  console.log("registering mediasoup handlers");

  // ---------------- RTP CAPS ----------------
  socket.on("getRtpCapabilities", (callback) => {
    try {
      console.log("Getting rtp capabilities");
      callback({ rtpCapabilities: getRtpCapabilities() });
    } catch (err) {
      console.error("getRtpCapabilities failed", err);
      callback({ error: "Failed to get RTP capabilities" });
    }
  });

  // ---------------- TRANSPORT ----------------
  socket.on("createWebRtcTransport", async ({ direction }, callback) => {
    if (direction !== "send" && direction !== "recv") {
      return callback({ error: "Invalid transport direction" });
    }

    try {
      const router = getMediasoupRouter();

      const transport = await router.createWebRtcTransport(
        webRtcTransportOptions
      );

      socket.data.transports ??= {};
      socket.data.transports[direction] = transport;
      console.log("Transport created ");
      transport.on("dtlsstatechange", (state) => {
        if (state === "closed") transport.close();
      });

      transport.on("close", () => {
        console.log(`Transport closed (${direction}) ${socket.id}`);
      });

      callback({
        transportOptions: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        }
      });
    } catch (err) {
      console.error("createWebRtcTransport failed", err);
      callback({ error: "Failed to create WebRTC transport" });
    }
  });

  socket.on("connectTransport", async ({ direction, dtlsParameters }, callback) => {
    try {
      const transport = socket.data?.transports?.[direction];
      if (!transport) {
        return callback({ error: "Transport not found" });
      }

      // ---- IMPORTANT GUARD ----
      if (transport.dtlsState === "connected") {
        return callback({ connected: true });
      }

      await transport.connect({ dtlsParameters });
      console.log("Transport connected in mediasoup.js");
      callback({ connected: true });
    } catch (err) {
      console.error("connectTransport failed", err);
      callback({ error: "Failed to connect transport" });
    }
  });

  // ---------------- PRODUCE ----------------
  socket.on("produce", async ({ kind, rtpParameters, appData }, callback) => {
    try {
      if (kind !== "video") {
        return callback({ error: "Only video supported (v1)" });
      }

      const transport = socket.data?.transports?.send;
      if (!transport) {
        return callback({ error: "Send transport not found" });
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData
      });

      //here we may add the findCheck // ---- track producers per socket (ownership) ----
               socket.data.producers ??= {};
               socket.data.producers[producer.id] = producer;

// ---- track globally (SFU registry) ----
producers.set(producer.id, producer);

    //  producers.set(producer.id, producer);

    console.log("Checking production logs");
      producer.on("transportclose", () => {
        producers.delete(producer.id);
        producer.close();
      });

      producer.on("close", () => {
        producers.delete(producer.id);
      });

      callback({ id: producer.id });
    } catch (err) {
      console.error("produce failed", err);
      callback({ error: "Failed to produce" });
    }
  });

  // ---------------- PRODUCER LIST ----------------
  socket.on("getProducers", (callback) => {
    callback({
      producerIds: Array.from(producers.keys())
    });
  });

  // ---------------- CONSUME ----------------
  socket.on("consume", async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const router = getMediasoupRouter();

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: "Cannot consume producer" });
      }

      const transport = socket.data?.transports?.recv;
      if (!transport) {
        return callback({ error: "Recv transport not found" });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false // v1: flow immediately
      });

      console.log("COnsume check in mediasoup");

      socket.data.consumers ??= {};
      socket.data.consumers[consumer.id] = consumer;

      consumer.on("transportclose", () => {
        delete socket.data.consumers[consumer.id];
      });

      consumer.on("producerclose", () => {
        consumer.close();
        delete socket.data.consumers[consumer.id];
      });

      callback({
        consumerParameters: {
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        }
      });
    } catch (err) {
      console.error("consume failed", err);
      callback({ error: "Failed to consume" });
    }
  });

  socket.on("disconnect", () => {
  console.log("Socket disconnected:", socket.id);

  if (socket.data?.producers) {
    Object.values(socket.data.producers).forEach((producer) => {
      producers.delete(producer.id);
      producer.close();
    });
  }
});

}
