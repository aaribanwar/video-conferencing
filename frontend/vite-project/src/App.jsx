import { useEffect, useRef } from "react";
import * as mediasoupClient from "mediasoup-client";
import { io } from "socket.io-client";

// Socket is intentionally module-scoped (single connection)
const socket = io("http://localhost:3000");

export default function App() {
  const videoRef = useRef(null);

  // ---- protocol guards (MANDATORY) ----
  const startedRef = useRef(false);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const producerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // ---- StrictMode / idempotency guard ----
      if (startedRef.current) {
        console.warn("mediasoup already started, skipping");
        return;
      }
      startedRef.current = true;

      console.log("Starting mediasoup test");

      try {
        // 1. Get RTP capabilities
        const rtpCapabilities = await new Promise((resolve, reject) => {
          socket.emit("getRtpCapabilities", (res) => {
            if (res?.error) reject(res.error);
            else resolve(res.rtpCapabilities);
          });
        });

        if (cancelled) return;
        console.log("RTP Capabilities received");

        // 2. Create and load Device (once)
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        if (cancelled) return;
        console.log("Device loaded");

        // 3. Get camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        if (cancelled) return;

        // 4. Create send transport (once)
        const transportOptions = await new Promise((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { direction: "send" },
            (res) => {
              if (res?.error) reject(res.error);
              else resolve(res.transportOptions);
            }
          );
        });

        if (cancelled) return;

        const sendTransport = device.createSendTransport(transportOptions);
        sendTransportRef.current = sendTransport;

        // 5. Connect transport (EXACTLY ONCE per transport)
        sendTransport.on("connect", ({ dtlsParameters }, cb, errCb) => {
          socket.emit(
            "connectTransport",
            { direction: "send", dtlsParameters },
            (res) => {
              if (res?.error) {
                errCb(res.error);
              } else {
                cb();
              }
            }
          );
        });

        // 6. Produce video
        sendTransport.on("produce", ({ kind, rtpParameters }, cb, errCb) => {
          socket.emit(
            "produce",
            { kind, rtpParameters },
            (res) => {
              if (res?.error) errCb(res.error);
              else cb({ id: res.id });
            }
          );
        });

        const track = stream.getVideoTracks()[0];
        const producer = await sendTransport.produce({ track });
        producerRef.current = producer;

        console.log("VIDEO PRODUCER ID:", producer.id);
        alert("Producer ID:\n" + producer.id);
      } catch (err) {
        console.error("mediasoup start failed:", err);
      }
    }

    start();

    // ---- CLEANUP (resource release, not protocol reset) ----
    return () => {
      cancelled = true;
      console.log("Cleaning up mediasoup test");

      try {
        producerRef.current?.close();
        producerRef.current = null;

        sendTransportRef.current?.close();
        sendTransportRef.current = null;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        deviceRef.current = null;
        startedRef.current = false;
      } catch (err) {
        console.warn("Cleanup error:", err);
      }
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>mediasoup video test (publisher)</h2>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
}
