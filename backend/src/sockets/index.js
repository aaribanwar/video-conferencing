import { Server } from "socket.io";
import { registerMediasoupHandlers } from "./handlers/mediasoup.js";

export default function connectToSocket(server) {
  const io = new Server(server);

  io.on("connection", (socket) => {
    registerMediasoupHandlers(socket);
  });

  return io;
}
