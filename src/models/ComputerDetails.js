const mongoose = require('mongoose');

const computerDetailsSchema = new mongoose.Schema({
    computerId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    specs: {
        cpu: String,
        ram: String,
        gpu: String,
        storage: String
    }
}, { timestamps: true });

module.exports = mongoose.model('ComputerDetails', computerDetailsSchema);