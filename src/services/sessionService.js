const {PrismaClient} = require('@prisma/client');
const session = require('express-session');
const prisma = new PrismaClient();

async function startSession(userId, computerId){
    try{

        if(userId === null){
            throw new Error('Користувач не авторизований!');
        }

        const result = await prisma.$transaction(async (tx) => {

            const existingSession = await tx.session.findFirst({
                where: {
                    userId: parseInt(userId),
                    endTime: null
                },
                include: {
                    computer: true
                }
            });

            if (existingSession) {
                throw new Error(`Ви вже працюєте за комп'ютером ${existingSession.computerId}! Спочатку завершіть стару сесію.`);
            }

            const computer = await tx.computer.findUnique({
                where: {id: parseInt(computerId)}
            });

            if(!computer || computer.status !== "AVAILABLE"){
                throw new Error('Комп\'ютер зайнятий або не існує!');
            }

            const newSession = await tx.session.create({
                data: {
                    userId: parseInt(userId),
                    computerId: parseInt(computerId),
                    startTime: new Date()
                }
            });

            await tx.computer.update({
                where: {id: parseInt(computerId)},
                data: {status: "BUSY"}
            });

            return newSession;
        });

        return [201, result];
    }
    catch(e){
        console.error(e);
        return [400, {error: e.message}];
    }
}

async function endSession(userId){
    try{
        const result = await prisma.$transaction(async (tx) =>{
            const activeSession = await tx.session.findFirst({
                where: {userId: parseInt(userId), endTime: null}
            });

            if(!activeSession){
                throw new Error("В цього користувача немає відкритої сесії!");
            }

            const updatedSession = await tx.session.update({
                where: {id: activeSession.id},
                data: {endTime: new Date()}
            });

            await tx.computer.update({
                where: {id: activeSession.computerId},
                data: {status: "AVAILABLE"}
            })

            return activeSession
        });

        return [200, result];
    }
    catch(e){
        console.error(e);
        return [400, {error: e.message}];
    }
}

async function forceStopSession(computerId) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            
            const activeSession = await tx.session.findFirst({
                where: {
                    computerId: parseInt(computerId),
                    endTime: null
                }
            });

            if (!activeSession) {
                throw new Error("На цьому комп'ютері немає активної сесії!");
            }

            const updatedSession = await tx.session.update({
                where: { id: activeSession.id },
                data: { endTime: new Date() }
            });

            await tx.computer.update({
                where: { id: parseInt(computerId) },
                data: { status: "AVAILABLE" }
            });

            return updatedSession;
        });

        return [200, result];
    }
    catch (e) {
        console.error("Force Stop Error:", e);
        return [400, { error: e.message }];
    }
}

module.exports = { startSession, endSession, forceStopSession };