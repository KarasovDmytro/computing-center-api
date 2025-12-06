const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: Number,
        required: false
    },
    userRole: {
        type: String,
        required: false
    },
    userName: {
        type: String,
        required: false
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip: {
        type: String,
        required: false
    },
    level: {
        type: String,
        enum: ['INFO', 'WARNING', 'ERROR', 'DANGER'],
        default: 'INFO'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('AuditLog', auditLogSchema);