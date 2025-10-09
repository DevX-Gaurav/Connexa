import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ConnectDb } from "./Config/db.js";
import bodyParser from "body-parser";
import userAuthRoute from "./routes/user.auth.route.js";
import chatRoute from "./routes/chat.route.js";
import statusRoute from "./routes/status.route.js";
import cors from "cors";
import initializeSocket from "./services/socket.service.js";
import http from "http";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const corsOption = {
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // credentials: true,
};

/* middlewares */
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

/* create server */
const server = http.createServer(app);
const io = initializeSocket(server);

/* apply socket middleware before all routes */
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

app.get("/", (req, res) => {
  res.status(200).send("hello new request.");
});

/* routes */
app.use("/api/auth", userAuthRoute);
app.use("/api/chat", chatRoute);
app.use("/api/status", statusRoute);

ConnectDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}.`);
  });
});
