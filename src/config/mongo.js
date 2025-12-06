const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('MongoDB Connected successfully');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB Disconnected');
});

module.exports = connectDB;