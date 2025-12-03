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

            res.render('pages/dashboard', {
                computers: computers,
                activeComputerId: activeComputerId,
                query: req.query
            });
        }
        catch(e){
            console.log("Error when requesting computers data: ", e);
            res.status(500).render('pages/error', {message: "Помилка при отримані комп'ютерів"});
        };
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

            res.redirect('/computers');
        }
        catch(e){
            console.error('Помилка при створенні комп\'ютера:', e);
      
            if (e.code === 'P2002') {
                return res.status(400).send('Комп\'ютер з таким номером вже існує!');
            }
      
            res.status(500).send('Не вдалося створити комп\'ютер');
        }
    },
    finishMaintenance: async (req, res) => {
        const { computerId } = req.body;
        try{
            await prisma.computer.update({
                where: {id: parseInt(computerId)},
                data: {status: 'AVAILABLE'}
            });

            res.redirect('/computer');
        }
        catch(e){
            console.error(error);
            res.status(500).send("Не вдалося завершити ремонт");
        }
    }
};

module.exports = computerController;