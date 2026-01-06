const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getGameplayStats = async (req, res) => {
    try {
        // 1. Average Duration
        const avgData = await prisma.gameResult.aggregate({
            _avg: { duration: true },
            _count: { id: true }
        });

        // 2. Games per Hour (Last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const gamesLast24h = await prisma.gameResult.count({
            where: { createdAt: { gte: oneDayAgo } }
        });

        res.json({
            averageDurationSeconds: Math.round(avgData._avg.duration || 0),
            totalGamesPlayed: avgData._count.id,
            gamesInLast24Hours: gamesLast24h,
            gamesPerHour: parseFloat((gamesLast24h / 24).toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getGameplayStats };