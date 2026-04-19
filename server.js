require('dotenv').config();
const express = require('express');
const http = require('http');
// do not change
const dns = require("node:dns");


const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
// do not change this lline 
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const authRoutes    = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userRoutes    = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const aiRoutes      = require('./routes/aiRoutes');

// ── Connect DB ──────────────────────────────────────────────
connectDB();

const app        = express();
const httpServer = http.createServer(app);

// ── Socket.io ───────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
].filter(Boolean);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

const onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('user_connected', (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit('online_users', Object.keys(onlineUsers));
  });

  socket.on('join_chat', (chatId) => socket.join(chatId));

  socket.on('send_message', ({ chatId, message }) => {
    socket.to(chatId).emit('receive_message', message);
  });

  socket.on('send_notification', ({ recipientId, notification }) => {
    const recipientSocket = onlineUsers[recipientId];
    if (recipientSocket) io.to(recipientSocket).emit('new_notification', notification);
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find(k => onlineUsers[k] === socket.id);
    if (userId) delete onlineUsers[userId];
    io.emit('online_users', Object.keys(onlineUsers));
  });
});

app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ── Security Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests for all routes
app.options('*', cors());

// ── Rate Limiting ───────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: 'Too many requests, please try again later.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
});

// ── General Middleware ──────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',     authLimiter,  authRoutes);
app.use('/api/requests', apiLimiter,   requestRoutes);
app.use('/api/users',    apiLimiter,   userRoutes);
app.use('/api/messages', apiLimiter,   messageRoutes);
app.use('/api/ai',       apiLimiter,   aiRoutes);

// ── Health Check ────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'OK',
  env: process.env.NODE_ENV,
  timestamp: new Date().toISOString(),
}));

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
