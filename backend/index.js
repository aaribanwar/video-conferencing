import { createServer } from "node:http";
import 'dotenv/config';

import createApp from "./src/app.js";
import connectToSocket from "./src/sockets/index.js";
import { initMediasoup } from "./src/mediasoup/index.js";

const port = process.env.PORT || 3000;

// Create express app
const app = createApp();

// Create HTTP server
const server = createServer(app);

//run initialise mediasoup
await initMediasoup(); // BEFORE sockets

// Attach socket.io
connectToSocket(server);




// Start listening
server.listen(port, () => {
  console.log("listening on port:", port);
});
