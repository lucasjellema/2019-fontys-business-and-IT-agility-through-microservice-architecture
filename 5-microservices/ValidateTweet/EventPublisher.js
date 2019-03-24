const kafka = require('kafka-node');
const config = require('./config');

var APP_VERSION = "0.9.1"
var APP_NAME = "EventBusPublisher"


console.log("Initialized module " + APP_NAME + "version " + APP_VERSION);

console.log(`Attempting to create client for ${config.kafka_server_host}:${config.kafka_server_port}`)
const Producer = kafka.Producer;
const client = new kafka.KafkaClient({kafkaHost: `${config.kafka_server_host}:${config.kafka_server_port}`});
const producer = new Producer(client);
const kafka_topic = config.kafka_topic;
const KeyedMessage = kafka.KeyedMessage

function initializeKafkaProducer(attempt) {

  try {
    console.log(kafka_topic);
    // payloads: Array,array of ProduceRequest, ProduceRequest is a JSON object 
    // with fields topic, messages (array of individual messages), key (only needed with KeyPartitioner), partition (defaults to 0) , attributes (default to 0), timestamp (also set as default Date.now())
    let payloads = [
      {
        topic: kafka_topic,
        messages: [ new KeyedMessage('EventBusEvent', JSON.stringify({"news":"The Lastest News of the World"}))
                  , new KeyedMessage('EventBusEvent', JSON.stringify({"more news":"The Lastest News of the Cluster","comments":"No Comment"})) ]
      }
    ];
  
    producer.on('ready', async function() {
      let push_status = producer.send(payloads, (err, data) => {
        if (err) {
          console.log('[kafka-producer -> '+kafka_topic+']: broker update failed');
        } else {
          console.log('[kafka-producer -> '+kafka_topic+']: broker update success');
        }
      });
    });
  
    producer.on('error', function(err) {
      console.log(err);
      console.log('[kafka-producer -> '+kafka_topic+']: connection errored');
      throw err;
    });
  }
  catch(e) {
    console.log(e);
  }
}//initializeKafkaProducer
initializeKafkaProducer(1);

var eventPublisher = module.exports;


eventPublisher.publishEvent = function (eventKey, event, topic) {
  km = new KeyedMessage(eventKey, JSON.stringify(event));
  payloads = [
    { topic: topic, messages: [km], partition: 0 }
  ];
  producer.send(payloads, function (err, data) {
    if (err) {
      console.error("Failed to publish event with key " + eventKey + " to topic " + topic + " :" + JSON.stringify(err));
    }
    console.log("Published event with key " + eventKey + " to topic " + topic + " :" + JSON.stringify(data));
  });

}
