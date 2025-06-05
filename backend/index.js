//const express = require('express');

import dotenv from "dotenv";
import { connectDB } from './db/connectDB.js';
import express from "express";
import authRoutes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";



// username: salmanwzb
// password // ZtmnoLKr30L6mY2s



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(cors({origin: "http://localhost:5173", credentials:true}));
 
app.use(express.json());// parses incoming http json requests convert into JS object 
app.use(cookieParser());
//allows us to parse incomig cookie


app.use("/api/auth", authRoutes);

if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "/frontend/dist")));

    app.get("*", (req,res)=>{
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    });
}

app.listen(5000, () =>{
    connectDB();
    console.log("Server is running on PORT", PORT); 
})