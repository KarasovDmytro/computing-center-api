const {startSession, endSession} = require("../services/sessionService.js")

const sessionController = {
    startSessionController: async (req, res) =>{
        const { computerId } = req.body;
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await startSession(userId, computerId);
        res.status(code).json(jsonRes);
    },
    endSessionController: async (req, res) =>{
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await endSession(userId);
        res.status(code).json(jsonRes);
    }
};

module.exports = sessionController;