import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import router from "./routes/index.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

// --------------- Global Middlewares ---------------

// HTTP request logging
app.use(morgan("dev"));

// CORS — allow frontend origin (adjust in production)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
      
      // Allow the configured origin, or any vercel.app subdomain
      if (origin === allowedOrigin || origin.endsWith('.vercel.app') || origin === 'http://localhost:5173') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Parse cookies (for JWT httpOnly cookies)
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------

app.use("/api", router);

// --------------- Error Handling ---------------

// Global error handler (must be after all routes)
app.use(errorHandler);

export default app;
