import express from "express";
import mongoose from "mongoose";
import {createServer} from "node:http";
// import cors form "cors";
import {Server} from "socket.io";
import 'dotenv/config';


const app = express();
const port = process.env.PORT;

app.get("/home", (req,res) => {
    return res.json({"hello":"world"});
});

app.listen(port || 3000, () => {
    console.log("listening on port:", port || 3000);
});






