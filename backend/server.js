require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Built-in body parser

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Routes
const markerRoutes = require('./routes/markers');
app.use('/api', markerRoutes);

// Serve static files from frontend
app.use(express.static('../frontend'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});