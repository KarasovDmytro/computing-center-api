const {PrismaClient} = require('@prisma/client');
const session = require('express-session');
const prisma = new PrismaClient();
const redisClient = require('../config/redis');

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

        await redisClient.del('computers:dashboard_list');
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
        await redisClient.del('computers:dashboard_list');
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
        await redisClient.del('computers:dashboard_list');
        return [200, result];
    }
    catch (e) {
        console.error("Force Stop Error:", e);
        return [400, { error: e.message }];
    }
}

async function getSessions(page, limit, search, status){
    try{
        const offset = (page - 1) * limit;
        const searchCondition = search ? {
            OR: [
                { user: { pib: { contains: search, mode: 'insensitive' } } },             
                { user: { login: { contains: search, mode: 'insensitive' } } },
                { computer: { inventoryNumber: { contains: search, mode: 'insensitive' } } },
                { computer: { location: { contains: search, mode: 'insensitive' } } }
            ]
        } : {};
        
        let statusCondition = {};
        if (status === 'active') {
            statusCondition = { endTime: null };
        } else if (status === 'finished') {
            statusCondition = { endTime: { not: null } };
        }

        const whereClause = {
            ...searchCondition,
            ...statusCondition
        };

        const [sessions, count] = await prisma.$transaction((async (tx) =>{
            const gotSessions = await tx.session.findMany({
                where: whereClause,
                take: limit,
                skip: offset,
                orderBy: {startTime: "desc"},
                include: {user: true, computer: true}
            });
    
            const counter = await tx.session.count({where: whereClause});
            return [gotSessions, counter];
        }));

        return [sessions, count, 200];
    }
    catch(e){
        console.log('Error in getting sessions!', e.message);
        return [[], 0, 500];
    }
}

module.exports = { startSession, endSession, forceStopSession, getSessions};