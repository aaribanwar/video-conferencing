import { Server } from "socket.io";
import { registerMediasoupHandlers } from "./handlers/mediasoup.js";

export default function connectToSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id );
  });

   io.on("connection", (socket) => {
    registerMediasoupHandlers(socket);
  });

  return io;
}
