import express from "express";
import mongoose from "mongoose";
import {createServer} from "node:http";
 import cors from "cors";
import {Server} from "socket.io";
import 'dotenv/config';
import "./src/controllers/socketManager.js";
import connectToSocket from "./src/controllers/socketManager.js";


const app = express();
const server = createServer(app);
const io = connectToSocket(server);

const port = process.env.PORT;
const mongo_uri = process.env.MONGO_URI;


app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb", extended: true}));

app.get("/home", (req,res) => {
    return res.json({"hello":"world"});
});

async function main() {
    console.log("MONGO_URI =", mongo_uri);

  await mongoose.connect(mongo_uri);
}

main().then( () => {
    console.log("connected to database");
    
})  

server.listen(port || 3000, () => {
    console.log("listening on port:", port || 3000);
});






