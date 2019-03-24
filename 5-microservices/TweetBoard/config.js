module.exports = {
  kafka_topic: process.env.KAFKA_TOPIC || 'workflowEvents',
  kafka_server_host: process.env.KAFKA_HOST || "kafka.kafka-ca1",
  kafka_server_port: process.env.ZOOKEEPER_PORT || "9092",
};