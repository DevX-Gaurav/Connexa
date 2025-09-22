import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ConnectDb } from "./Config/db.js";
import bodyParser from "body-parser";
import userAuthRoute from "./routes/user.auth.route.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* middlewares */
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

/* routes */
app.use("/api/auth", userAuthRoute);

ConnectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}.`);
  });
});
