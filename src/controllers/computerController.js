const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const computerController = {
    getAllComputers: async (req, res) =>{
        try{
            const { search, status } = req.query;
            const whereClause = {};

            if (status) {
                whereClause.status = status;
            }

            if (search) {
                whereClause.OR = [
                    { 
                        inventoryNumber: { 
                            contains: search, 
                            mode: 'insensitive'
                        } 
                    },
                    { 
                        location: { 
                            contains: search, 
                            mode: 'insensitive' 
                        } 
                    }
                ];
            }

            const computers = await prisma.computer.findMany({
                where: whereClause,
                orderBy: {
                    inventoryNumber: "asc"
                }
            });

            let activeComputerId = null;
        
            if (req.session.user) {
                const activeSession = await prisma.session.findFirst({
                    where: {
                        userId: req.session.user.id,
                        endTime: null
                    },
                    select: { computerId: true }
                });
            
            if (activeSession) {
                activeComputerId = activeSession.computerId;
            }
        }

            const flashMessage = req.session.flash;
            delete req.session.flash;

            res.render('pages/dashboard', {
                computers: computers,
                activeComputerId: activeComputerId,
                query: req.query,
                flashMessage
            });
        }
        catch(e){
            console.log("Error when requesting computers data: ", e);
            res.status(500).render('pages/error', {message: "Помилка при отримані комп'ютерів"});
        };
    },

    getAddComputerForm: (req, res) =>{
        res.render('pages/add-pc');
    },

    addComputer: async (req, res) => {
        try{
            const { inventoryNumber, location } = req.body;

            if(!inventoryNumber || !location){
                return res.status(400).send('Інвентарний номер та локація обов\'язкові!');
            }

            const newPC = await prisma.computer.create({
                data: {
                    inventoryNumber,
                    location,
                    status: "AVAILABLE"
                }
            });

            req.session.flash = {type: 'success', message: `Комп'ютер ${inventoryNumber} успішно додано!`};

            req.session.save(() => {
                res.redirect('/computer');
            });
        }
        catch(e){
            console.error('Помилка при створенні комп\'ютера:', e);
      
            if (e.code === 'P2002') {
                req.session.flash = { type: 'danger', message: 'Такий ПК вже існує' };
                return req.session.save(() => res.redirect('/computer/create-form'));
            }
      
            req.session.flash = { type: 'danger', message: 'Помилка створення ПК' };
            req.session.save(() => res.redirect('/computer/create-form'));
        }
    },

    finishMaintenance: async (req, res) => {
        try{
            const { computerId } = req.body;

            await prisma.computer.update({
                where: {id: parseInt(computerId)},
                data: {status: 'AVAILABLE'}
            });

            res.redirect('/computer');
        }
        catch(e){
            console.error(e);
            res.status(500).send("Не вдалося завершити ремонт");
        }
    },

    startMaintenance: async (req, res) => {
        try{
            const {computerId} = req.body;

            await prisma.computer.update({
                where: {id: parseInt(computerId)},
                data: {status: "MAINTENANCE"}
            });

            res.redirect('/computer');
        }
        catch(e){
            console.error(e);
            res.status(500).send("Не вдалося почати ремонт");
        }
    }
};

module.exports = computerController;