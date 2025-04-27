import express from "express";
import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Please set SUPABASE_URL and SUPABASE_KEY in your .env file.");
  process.exit(1);
}
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
      (item) => item == data.email
    );
    if (arrofSameEmail.length === 0) {
      supabase
        .from("userData")
        .insert({
          name: data.name,
          email: data.email,
          password: data.password,
        });
      socket.emit("isCorrectReg", true);
    }
  });
});

server.listen(5000, () => {
  console.log("------server listening on port 5000-------");
});
