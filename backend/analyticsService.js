const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma
const prisma = new PrismaClient();

// Configure Kafka with retry logic for stability
const kafka = new Kafka({
  clientId: 'analytics-worker',
  brokers: ['localhost:9092'],
  retry: {
    initialRetryTime: 500,
    retries: 10
  }
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

const runAnalytics = async () => {
  console.log("🚀 Analytics Service starting...");

  try {
    await consumer.connect();
    console.log("✅ Connected to Kafka");

    // Subscribe to the topic
    await consumer.subscribe({ 
        topic: 'game-analytics', 
        fromBeginning: true 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const rawValue = message.value.toString();
        const event = JSON.parse(rawValue);
        
        console.log(`📩 Received event: ${event.type}`);

        if (event.type === 'GAME_FINISHED') {
          const { player1, player2, winner, moves, duration } = event.data;

          // 1. Save Game Record to Postgres
          const gameRecord = await prisma.gameResult.create({
            data: {
              player1: player1,
              player2: player2,
              winner: winner,
              duration: duration || 0,
              createdAt: new Date()
            }
          });

          // 2. Update Leaderboard Stats
          // We only track wins for real users, not the bot
          if (winner !== 'draw' && winner !== 'Competitive Bot') {
            await prisma.user.upsert({
              where: { username: winner },
              update: { 
                wins: { increment: 1 },
                gamesPlayed: { increment: 1 }
              },
              create: {
                username: winner,
                wins: 1,
                gamesPlayed: 1
              }
            });
          }

          // Also increment gamesPlayed for the loser/other player
          const otherPlayer = winner === player1 ? player2 : player1;
          if (otherPlayer !== 'Competitive Bot' && otherPlayer !== 'draw') {
              await prisma.user.update({
                  where: { username: otherPlayer },
                  data: { gamesPlayed: { increment: 1 } }
              }).catch(() => {/* Ignore if user doesn't exist yet */});
          }

          console.log(`🏆 Database Updated: ${winner} won in ${moves} moves.`);
        }
      },
    });
  } catch (error) {
    console.error("❌ Analytics Service Error:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
const transitions = ['SIGINT', 'SIGTERM'];
transitions.forEach(sig => {
  process.on(sig, async () => {
    await consumer.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  });
});

runAnalytics();