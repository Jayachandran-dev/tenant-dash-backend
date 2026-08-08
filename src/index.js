require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const tenantRoutes = require("./routes/tenants");
const userRoutes = require("./routes/users");
const businessRoutes = require("./routes/business");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://tenant-dash-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PATCH"],
  },
});

// Make io available in routes
app.set("io", io);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Client joins a tenant room
  socket.on("join-tenant", (tenantId) => {
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      console.log(`Socket ${socket.id} joined tenant:${tenantId}`);
    }
  });

  // Client leaves a tenant room
  socket.on("leave-tenant", (tenantId) => {
    if (tenantId) {
      socket.leave(`tenant:${tenantId}`);
      console.log(`Socket ${socket.id} left tenant:${tenantId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});