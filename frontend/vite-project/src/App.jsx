import { useEffect, useRef } from "react";
import * as mediasoupClient from "mediasoup-client";
import { io } from "socket.io-client";

// single socket per tab
const socket = io("http://localhost:3000");

export default function App() {
  const localVideoRef = useRef(null);

  // ---- protocol guards ----
  const startedRef = useRef(false);
  const deviceRef = useRef(null);

  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);

  const producerRef = useRef(null);
  const consumersRef = useRef(new Map());

  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (startedRef.current) return;
      startedRef.current = true;

      console.log("Starting mediasoup session");

      try {
        // ---------------- RTP CAPS ----------------
        const rtpCapabilities = await new Promise((resolve, reject) => {
          socket.emit("getRtpCapabilities", (res) => {
            if (res?.error) reject(res.error);
            else resolve(res.rtpCapabilities);
          });
        });

        if (cancelled) return;

        // ---------------- DEVICE ----------------
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        // ---------------- CAMERA ----------------
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // ---------------- SEND TRANSPORT ----------------
        const sendTransportOptions = await new Promise((resolve, reject) => {
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

        const sendTransport = device.createSendTransport(sendTransportOptions);
        sendTransportRef.current = sendTransport;

        sendTransport.on("connect", ({ dtlsParameters }, cb, errCb) => {
          socket.emit(
            "connectTransport",
            { direction: "send", dtlsParameters },
            (res) => (res?.error ? errCb(res.error) : cb())
          );
        });

        sendTransport.on("produce", ({ kind, rtpParameters }, cb, errCb) => {
          socket.emit(
            "produce",
            { kind, rtpParameters },
            (res) =>
              res?.error ? errCb(res.error) : cb({ id: res.id })
          );
        });

        const track = stream.getVideoTracks()[0];
        const producer = await sendTransport.produce({ track });
        producerRef.current = producer;

        console.log("Produced local video:", producer.id);

        // ---------------- RECV TRANSPORT ----------------
        const recvTransportOptions = await new Promise((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { direction: "recv" },
            (res) => {
              if (res?.error) reject(res.error);
              else resolve(res.transportOptions);
            }
          );
        });

        if (cancelled) return;

        const recvTransport = device.createRecvTransport(recvTransportOptions);
        recvTransportRef.current = recvTransport;

        recvTransport.on("connect", ({ dtlsParameters }, cb, errCb) => {
          socket.emit(
            "connectTransport",
            { direction: "recv", dtlsParameters },
            (res) => (res?.error ? errCb(res.error) : cb())
          );
        });

        // ---------------- GET PRODUCERS ----------------
        const producerIds = await new Promise((resolve) => {
          socket.emit("getProducers", (res) => {
            resolve(res.producerIds || []);
          });
        });

        console.log("Available producers:", producerIds);

        // ---------------- CONSUME ----------------
        for (const producerId of producerIds) {
          // optional: skip own producer (comment this out to see yourself)
          if (producerId === producer.id) continue;
          console.log("in producerId cycling loop");

          const { consumerParameters, error } = await new Promise((resolve) => {
            socket.emit(
              "consume",
              {
                producerId,
                rtpCapabilities: device.rtpCapabilities
              },
              (res) => resolve(res)
            );
          });

          if (error) {
            console.warn("Consume failed for", producerId, error);
            continue;
          }

          // const consumer = await recvTransport.consume(consumerParameters);
          // consumersRef.current.set(consumer.id, consumer);
          // //logging check
          // console.log(consumer);

          // const remoteVideo = document.createElement("video");
          // remoteVideo.srcObject = new MediaStream([consumer.track]);
          // remoteVideo.autoplay = true;
          // remoteVideo.playsInline = true;
          // remoteVideo.style.width = "300px";
          // remoteVideo.style.border = "1px solid black";

          // document.body.appendChild(remoteVideo);

          const consumer = await recvTransport.consume(consumerParameters);
          //logger
          
// 🔑 REQUIRED: start RTP flow
await consumer.resume();

const remoteVideo = document.createElement("video");
remoteVideo.srcObject = new MediaStream([consumer.track]);
remoteVideo.autoplay = true;
remoteVideo.playsInline = true;
remoteVideo.muted = true; // 🔑 REQUIRED for autoplay
remoteVideo.style.width = "300px";
remoteVideo.style.border = "1px solid black";

document.body.appendChild(remoteVideo);

        }
      } catch (err) {
        console.error("Mediasoup start failed:", err);
      }
    }

    start();

    // ---------------- CLEANUP ----------------
    return () => {
      cancelled = true;
      console.log("Cleaning up mediasoup session");

      try {
        consumersRef.current.forEach((c) => c.close());
        consumersRef.current.clear();

        producerRef.current?.close();
        producerRef.current = null;

        sendTransportRef.current?.close();
        recvTransportRef.current?.close();

        sendTransportRef.current = null;
        recvTransportRef.current = null;

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
      <h2>mediasoup SFU test (send + consume)</h2>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: 300, border: "2px solid green" }}
      />
    </div>
  );
}
