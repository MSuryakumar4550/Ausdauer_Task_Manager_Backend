const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const connectDB = require('./config/db');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cron = require('node-cron'); 
const User = require('./models/userModel'); 
const path = require('path'); // <--- Ensure this is here

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
app.set('io', io);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- SERVE IMAGES (Moved to Top) ---
// This makes http://localhost:5000/uploads/image.jpg work
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));

// --- CRON JOB ---
cron.schedule('0 0 1 * *', async () => {
  console.log('⏰ Running Monthly Leaderboard Reset...');
  try {
    await User.updateMany({ role: 'Employee' }, { $set: { score: 0 } });
    io.emit('task_update', { message: 'Monthly Leaderboard Reset!' });
  } catch (error) {
    console.error('❌ Auto-Reset Failed:', error);
  }
});

io.on('connection', (socket) => {
  console.log(`⚡: User connected ${socket.id}`);
  socket.on('join_room', (userId) => socket.join(userId));
});

// Error Handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode ? res.statusCode : 500;
    res.status(statusCode).json({ message: err.message });
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server started on port ${port}`));