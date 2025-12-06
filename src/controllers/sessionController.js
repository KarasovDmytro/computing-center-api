const { parse } = require("dotenv");
const {startSession, endSession, forceStopSession, getSessions} = require("../services/sessionService.js")
const { logAction } = require('../services/loggerService');

const sessionController = {
    startSessionController: async (req, res) =>{
        const { computerId } = req.body;
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await startSession(userId, computerId);
        if (code === 201) {
            await logAction(req, 'SESSION_START', { computerId });
            return res.redirect('/computer'); 
        } else {
            req.session.flash = {type: 'error', message: `Спочатку завершіть сеанс за іншим комп'ютером!`}
            return req.session.save(() => res.redirect('/computer'));
        }
    },
    endSessionController: async (req, res) =>{
        const { computerId } = req.body;
        console.log(computerId);
        const userId = req.session.user ? req.session.user.id : null;
        const [ code, jsonRes ] = await endSession(userId);
        if (code === 200) {
            await logAction(req, 'SESSION_END', { computerId });
            return res.redirect('/computer'); 
        } else {
            return res.status(code).send(jsonRes.error);
        }
    },
    adminStopSessionController: async (req, res) => {
        const { computerId } = req.body; 
        
        const [ code, result ] = await forceStopSession(computerId);

        if (code === 200) {
            await logAction(req, 'SESSION_FORCE_STOP', { computerId }, 'WARNING');
            return res.redirect('/computer'); 
        } else {
            return res.status(code).send(result.error);
        }
    },

    getSessionsPage: async (req, res) => {
        const limit = 10;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        const [sessions, count, code] = await getSessions(page, limit, search, status);
        const totalPages = Math.ceil(count / limit) || 1;

        if(code === 200){
            res.render('pages/sessions', {
                sessions,  
                totalPages,
                totalSessions: count,
                search,
                status,
                currentPage: page
            });
        }
        else{
            res.redirect('/session');
        }
    }
};

module.exports = sessionController;