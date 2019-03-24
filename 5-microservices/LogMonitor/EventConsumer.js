const kafka = require('kafka-node')
const config = require('./config');

var APP_VERSION = "0.2.3"
var APP_NAME = "EventBusConsumer"


console.log("Initialized module " + APP_NAME + "version " + APP_VERSION);

var consumer;

function initializeKafkaConsumer(attempt) {

  try {
    const Consumer = kafka.Consumer;
    console.log(`... trying to connect to Kafka at ${config.kafka_server_host}:${config.kafka_server_port}`)
    const client = new kafka.KafkaClient({kafkaHost: `${config.kafka_server_host}:${config.kafka_server_port}`});
    consumer = new Consumer(
      client,
      [{ topic: config.kafka_topic, partition: 0, offset: -1 }],
      {
        autoCommit: true,
        fetchMaxWaitMs: 1000,
        fetchMaxBytes: 1024 * 1024,
        encoding: 'utf8',
        fromOffset: false,
        groupId: 'event-bus-listener',
        'auto.offset.reset': 'latest'
      }
    );
    consumer.on('message', async function (message) {
      console.log('here');
      console.log(
        'kafka-> ',
        message.value
      );
      try {
        handleEventBusMessage(message);
      } catch (e) {
        console.log(`handling the message failed with error ${JSON.stringify(e)}`)
      }
    })
    consumer.on('error', function (err) {
      console.log('error', err);
    });
    consumer.on('connect', function () {
      console.log(`connected to kafkaTopic ${config.kafka_topic} at host ${config.kafka_server_host}:${kafka_server_port}`);
    })
  }
  catch (e) {
    console.log(e);
  }
}//initializeKafkaConsumer

process.once('SIGINT', function () {
  async.each([consumerGroup], function (consumer, callback) {
    consumer.close(true, callback);
  });
});


initializeKafkaConsumer(1);


var eventConsumer = module.exports;


eventConsumer.registerEventHandler = function ( topic, handler) {
    consumer.on('message', handler);
    consumer.on('error', function (err) {
      console.log("error in creation of Kafka consumer " + JSON.stringify(err));
      console.log("Try again in 5 seconds");
      setTimeout(initializeKafkaConsumer, 5000, attempt + 1);
    });
    consumer.addTopics([
      { topic:topic, partition: 0, offset: 0 }
    ], () => console.log("topic added: " + topic));
    console.log("Kafka Consumer - added message handler and added topic");

}
