import { getMediasoupRouter, getRtpCapabilities } from "../../mediasoup/router.js";
import { webRtcTransportOptions } from "../../mediasoup/config.js";

export function registerMediasoupHandlers(socket) {
  console.log("registering mediasoup handlers");

  
  socket.on("getRtpCapabilities", (callback) => {
    try {
      const rtpCapabilities = getMediasoupRouter().rtpCapabilities;
      callback({ rtpCapabilities });
    } catch (err) {
      console.error("getRtpCapabilities failed", err);
      callback({ error: "Failed to get RTP capabilities" });
    }
  });

  socket.on("createWebRtcTransport", async ({ direction }, callback) => {
    if (direction !== "send" && direction !== "recv") {
      return callback({ error: "Invalid transport direction" });
    }

    try {
      const router = getMediasoupRouter();

      const transport = await router.createWebRtcTransport(
        webRtcTransportOptions
      );

      // IMPORTANT: track transports per socket (temporary, v1)
      socket.data = socket.data || {};
      socket.data.transports = socket.data.transports || {};
      socket.data.transports[direction] = transport;

      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });

      transport.on("close", () => {
        console.log(`Transport closed (${direction}) for socket ${socket.id}`);
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


  socket.on(
  "connectTransport",
  async ({ direction, dtlsParameters }, callback) => {
    try {
      if (!socket.data?.transports?.[direction]) {
        return callback({ error: "Transport not found" });
      }

      const transport = socket.data.transports[direction];

      await transport.connect({ dtlsParameters });

      if (transport.dtlsState === "connected") {
      console.warn(`Transport already connected (${direction}) for socket ${socket.id}`);
       return callback({ connected: true });
      }


      callback({ connected: true });
    } catch (err) {
      console.error("connectTransport failed", err);
      callback({ error: "Failed to connect transport" });
    }
  }
);

socket.on(
  "produce",
  async ({ kind, rtpParameters, appData }, callback) => {
    try {
      if (kind !== "video") {
        return callback({ error: "Only video is supported right now" });
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

      // Track producer on socket (temporary)
      socket.data.producers = socket.data.producers || {};
      socket.data.producers.video = producer;

      producer.on("transportclose", () => {
        console.log("Video producer transport closed");
        producer.close();
      });

      producer.on("close", () => {
        console.log("Video producer closed");
      });

      callback({ id: producer.id });
    } catch (err) {
      console.error("produce video failed", err);
      callback({ error: "Failed to produce video" });
    }
  }
);


socket.on(
  "consume",
  async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const router = getMediasoupRouter();

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: "Cannot consume this producer" });
      }

      const transport = socket.data?.transports?.recv;
      if (!transport) {
        return callback({ error: "Recv transport not found" });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true // start paused, client resumes explicitly
      });

      socket.data.consumers = socket.data.consumers || {};
      socket.data.consumers[consumer.id] = consumer;

      consumer.on("transportclose", () => {
        console.log("Consumer transport closed");
      });

      consumer.on("producerclose", () => {
        console.log("Producer closed, consumer closing");
        consumer.close();
        delete socket.data.consumers[consumer.id];
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    } catch (err) {
      console.error("consume failed", err);
      callback({ error: "Failed to consume" });
    }
  }
);

}
