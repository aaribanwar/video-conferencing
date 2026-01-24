import express from "express";
import mongoose from "mongoose";
import {createServer} from "node:http";
// import cors form "cors";
import {Server} from "socket.io";



const app = express();

app.get("/home", (req,res) => {
    return res.json({"hello":"world"});
});





