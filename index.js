const express = require("express");
const cors = require("cors");
const { connectMongoDB } = require("./config/database");
const userResponseRoutes = require("./routes/userResponse.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectMongoDB();

// Routes
app.use("/api", userResponseRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
