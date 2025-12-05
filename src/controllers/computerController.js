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

            whereClause.deletedAt = null;

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
                return req.session.save(() => res.redirect('/computer'));
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
    },

    deleteComputer: async (req, res) => {
        try {
            const { id } = req.body;

            if (!id) {
                req.session.flash = { type: 'danger', message: 'ID комп\'ютера не передано.' };
                return req.session.save(() => res.redirect('/computer'));
            }

            const activeSession = await prisma.session.findFirst({
                where: {
                    computerId: parseInt(id),
                    endTime: null
                }
            });

            if (activeSession) {
                req.session.flash = { 
                    type: 'warning', 
                    message: 'Неможливо видалити: на цьому комп\'ютері зараз активна сесія! Спочатку завершіть її.' 
                };
                return req.session.save(() => res.redirect('/computer'));
            }

            const pc = await prisma.computer.findUnique({ where: { id: parseInt(id) } });
            if (!pc) return res.redirect('/computer');

            await prisma.computer.update({
                where: { id: parseInt(id) },
                data: {
                    deletedAt: new Date(),
                    status: 'ARCHIVED',
                    inventoryNumber: `${pc.inventoryNumber}_DEL_${Date.now()}`
                }
            });

            req.session.flash = { type: 'success', message: 'Комп\'ютер успішно перенесено в архів.' };
            req.session.save(() => res.redirect('/computer'));

        } catch (e) {
            console.error("Помилка при видаленні ПК:", e);
            req.session.flash = { type: 'danger', message: 'Сталася помилка при спробі видалення.' };
            req.session.save(() => res.redirect('/computer'));
        }
    }
};

module.exports = computerController;