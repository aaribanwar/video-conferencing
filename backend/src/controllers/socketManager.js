import {Server} from "socket.io";


export default function connectToSocket(server) {
   const io = new Server(server);
   return io;

}