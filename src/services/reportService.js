const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} год ${minutes} хв`;
}

async function getDailyReport(dateString, page = 1, limit = 10) {
    try {
        const date = dateString ? new Date(dateString) : new Date();
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const sessions = await prisma.session.findMany({
            where: {
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: { user: true }
        });

        const userStats = {};
        let totalSessionsCount = 0;

        sessions.forEach(session => {
            totalSessionsCount++;
            
            if (session.user.deletedAt) return; 

            const userId = session.user.id;
            
            if (!userStats[userId]) {
                userStats[userId] = {
                    user: session.user,
                    totalMs: 0,
                    sessionsCount: 0
                };
            }

            let duration = 0;
            if (session.endTime) {
                duration = new Date(session.endTime) - new Date(session.startTime);
            } else {
                duration = new Date() - new Date(session.startTime);
            }

            userStats[userId].totalMs += duration;
            userStats[userId].sessionsCount += 1;
        });

        const reportData = Object.values(userStats).sort((a, b) => b.totalMs - a.totalMs);

        const totalUsers = reportData.length;
        const totalPages = Math.ceil(totalUsers / limit) || 1;
        const offset = (page - 1) * limit;
        
        const paginatedData = reportData.slice(offset, offset + limit).map(item => ({
            ...item,
            formattedTime: formatDuration(item.totalMs)
        }));

        return {
            date: startOfDay,
            totalSessionsCount,
            reportData: paginatedData,
            totalPages,
            currentPage: page,
            totalUsers
        };

    } catch (e) {
        console.error("Report error:", e);
        throw e;
    }
}

module.exports = { getDailyReport };