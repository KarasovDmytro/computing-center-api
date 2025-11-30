const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const computerController = {
    getAllComputers: async (req, res) =>{
        try{
            const computers = await prisma.computer.findMany({
                orderBy: {
                    inventoryNumber: "asc"
                }
            });

            /*res.render('pages/computers', {
                computers: computers,
                title: "Список комп'ютерів"
            });*/

            res.json(computers);
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

            //res.redirect('/computers');
            res.status(201).json(newPC);
        }
        catch(e){
            console.error('Помилка при створенні комп\'ютера:', e);
      
            if (e.code === 'P2002') {
                return res.status(400).send('Комп\'ютер з таким номером вже існує!');
            }
      
            res.status(500).send('Не вдалося створити комп\'ютер');
        }
    } 
};

module.exports = computerController;