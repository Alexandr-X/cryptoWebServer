import express from "express";
import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const saltRounds = 10;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const secretKey = crypto.randomBytes(32).toString("hex");

// const supabaseUrl = "https://rvtgpibsbmbokrcjydko.supabase.co";
// const supabaseKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dGdwaWJzYm1ib2tyY2p5ZGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MDc0ODYsImV4cCI6MjA2MTA4MzQ4Nn0.2nZ0Ytr2HR2IxIGe8D0w5q9zW0kk0kQQaRKogO-NkBE";

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  socket.on("registr", async (data) => {
    const arrOfUsersEmail = await supabase.from("userData").select("email");
    const arrofSameEmail = arrOfUsersEmail.data.filter(
      (item) => item.email == data.email
    );
    if (arrofSameEmail.length === 0) {
      bcrypt.hash(data.password, saltRounds, async function (err, hash) {
        await supabase.from("userData").insert([
          {
            name: data.name,
            email: data.email,
            password: hash,
            logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAlg1-ZKpUt0a2506DkhjtkH8zHdDtnyUySA&s",
          },
        ]);
      });

      socket.emit("isCorrectReg", true);
    } else socket.emit("isCorrectReg", false);
  });
  socket.on("isCorrectLogin", async (data) => {
    const arrOfUsersEmail = await supabase
      .from("userData")
      .select("email,password");
    const arrofSameEmail = arrOfUsersEmail.data.filter(
      (item) => item.email == data.email
    );
    if (arrofSameEmail.length === 1) {
      bcrypt.compare(
        data.password,
        arrofSameEmail[0].password,
        function (err, result) {
          if (result) {
            socket.emit("isCorrectReg", true);
          } else if (!result) {
            socket.emit("isCorrectReg", false);
          }
        }
      );
    } else {
      socket.emit("isCorrectReg", false);
    }
  });
  socket.on("getAddInform", async (email) => {
    const arrOfuserInf = await supabase
      .from("userData")
      .select("email,wallet,logo,arrOfBoughts,arrOfPinCrpt,name");
    const userInf = arrOfuserInf.data.filter((item) => item.email === email);
    if (userInf.length) {
      socket.emit("giveAddInform", {
        logo: userInf[0].logo,
        name: userInf[0].name,
        money: userInf[0].wallet,
        arr: userInf[0].arrOfBoughts,
        arrOfPin: userInf[0].arrOfPinCrpt,
      });
    } else {
      socket.emit("giveAddInform", {
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAlg1-ZKpUt0a2506DkhjtkH8zHdDtnyUySA&s",
        money: 0,
        arr: "[]",
        arrOfPin: "[]",
      });
    }
  });
  socket.on("changeLogo", async (user) => {
    await supabase
      .from("userData")
      .update({ logo: user.logo })
      .eq("email", user.email);
  });
  socket.on("changeMoney", async (user) => {
    await supabase
      .from("userData")
      .update({ wallet: user.wallet })
      .eq("email", user.email);
  });
  socket.on("updArrofBoughts", async (user) => {
    await supabase
      .from("userData")
      .update({ arrOfBoughts: user.arr })
      .eq("email", user.email);
  });
  socket.on("udpArrOfPinCrpt", async (userArr) => {
    await supabase
      .from("userData")
      .update({ arrOfPinCrpt: userArr.arr })
      .eq("email", userArr.email);
  });
  socket.on("isWorkToken", (token) => {
    jwt.verify(token, secretKey, function (err) {
      if (!err) {
        socket.emit("getTokenAnser", true);
      } else {
        socket.emit("getTokenAnser", false);
      }
    });
  });
  socket.on("createToken", (email) => {
    socket.emit(
      "getToken",
      jwt.sign(
        { userEmail: email, exp: Math.floor(Date.now() / 1000) + 30 },
        secretKey
      )
    );
  });
  socket.on("getDescrAbout", async (name) => {
    const response = await fetch(
      "https://api.coinpaprika.com/v1/tickers?limit=30"
    ).then((data) => data.json());
    const desired = response.filter((item) => item.name == name);
    console.log(desired);
    if (desired.length === 1) {
      socket.emit("getCrptId", { isSuccsesful: true, data: desired[0].id });
    } else {
      socket.emit("getCrptId", { isSuccsesful: false });
    }
  });
});

server.listen(5000, () => {
  console.log("------server listening on port 5000-------");
});
