const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'game-server',
  brokers: ['localhost:9092'] // Matches docker-compose
});

const producer = kafka.producer();

const logGameEvent = async (eventData) => {
  await producer.connect();
  await producer.send({
    topic: 'game-analytics',
    messages: [{ value: JSON.stringify(eventData) }],
  });
  console.log("Event sent to Kafka:", eventData.type);
};

module.exports = { logGameEvent };