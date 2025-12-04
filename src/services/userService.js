const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function getNUsers(page, limit, search){
    try{
        const offset = (page - 1) * limit;

        const whereClause = search ? {
            OR: [
                {pib: {contains: search, mode: 'insensitive'}},
                {login: {contains: search, mode: 'insensitive'}}
            ]
        } : {};

        const [users, counter] = await prisma.$transaction(async (tx) => {
            const users = await tx.user.findMany({
                where: whereClause,
                skip: offset,
                take: limit,
                orderBy: {createdAt: "desc"}
            });

            const count = await tx.user.count({where: whereClause});
            return [users, count];
        });

        return [users, counter, 200];
    }
    catch(e){
        console.log("Yo err!");
        return [[], 0, 400];
    }
}

async function registerUsr(pib, login, password, role){
    try {
        const roleToGroupMap = {
            'DB_ADMIN': 'root',
            'PROGRAMMER': 'development',
            'OPERATOR': 'support',
            'HARDWARE_SPECIALIST': 'hardware',
            'USER': 'guest'
        };

        const accessGroup = roleToGroupMap[role] || 'guest';

        const newUser = await prisma.user.create({
            data: {
                pib: pib,
                login: login,
                password: password,
                role: role,
                accessGroup
            }
        });
        return [newUser, 201];
    } 
    catch (e) {
        if (e.code === 'P2002') {
            return [null, 409];
        }
        console.error("Error creating user:", e);
        return [null, 500];
    }
}

async function getUserById(id) {
    return await prisma.user.findUnique({ where: { id: parseInt(id) } });
}

async function updateUser(id, data) {
    try {
        const updateData = {
            pib: data.pib,
            login: data.login,
            role: data.role,
            accessGroup: data.accessGroup
        };

        if (data.password && data.password.trim() !== "") {
            updateData.password = data.password; 
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        return [updatedUser, 200];
    } 
    catch (e) {
        if (e.code === 'P2002') return [null, 409];
        console.error(e);
        return [null, 500];
    }
}

async function deleteUser(id) {
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        return 200;
    } 
    catch (e) {
        console.error(e);
        return 500;
    }
}

module.exports = {getNUsers, registerUsr, getUserById, updateUser, deleteUser};