const {startSession, endSession, forceStopSession} = require("../services/sessionService.js")

const sessionController = {
    startSessionController: async (req, res) =>{
        const { computerId } = req.body;
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await startSession(userId, computerId);
        if (code === 201) {
            return res.redirect('/computer'); 
        } else {
            return res.status(code).send(jsonRes.error);
        }
    },
    endSessionController: async (req, res) =>{
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await endSession(userId);
        if (code === 200) {
            return res.redirect('/computer'); 
        } else {
            return res.status(code).send(jsonRes.error);
        }
    },
    adminStopSessionController: async (req, res) => {
        const { computerId } = req.body; 
        
        const [ code, result ] = await forceStopSession(computerId);

        if (code === 200) {
            return res.redirect('/computer'); 
        } else {
            return res.status(code).send(result.error);
        }
    }
};

module.exports = sessionController;