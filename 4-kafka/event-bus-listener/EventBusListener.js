const kafka = require('kafka-node')
var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');

const config = require('./config');
// inspiration from https://thatcoder.space/getting-started-with-kafka-and-node-js-with-example/ 

var PORT = process.env.APP_PORT || 8096;
var APP_VERSION = "0.8.9"
var APP_NAME = "EventBusListener"


console.log("Running " + APP_NAME + "version " + APP_VERSION);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log(`Microservice' + ${APP_NAME}  running (version ${APP_VERSION}), Express is listening... at  ${PORT}  for /ping, /about and /event-bus calls`);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About EventBusListener, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/event-bus (GET)");
  res.write("NodeJS runtime version " + process.version);
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

app.get('/ping', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("Reply from " + APP_NAME);
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

app.get('/event-bus', function (req, res) {
  var document = { "topic": config.kafka_topic, "events": events };
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(document));
});

var events = [];
function initializeKafkaConsumer(attempt) {

  try {
    const Consumer = kafka.Consumer;
    console.log(`... trying to connect to Kafka at ${config.kafka_server_host}:${config.kafka_server_port}`)
    const client = new kafka.KafkaClient({kafkaHost: `${config.kafka_server_host}:${config.kafka_server_port}`});
    let consumer = new Consumer(
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

function handleEventBusMessage(eventMessage) {
  try {
    var event = JSON.parse(eventMessage.value);
    console.log("received message", eventMessage);
    console.log("received message object", JSON.stringify(eventMessage));
    console.log("actual event: " + JSON.stringify(event));
    events.push(event);
  } catch (e) {
    console.error("Exception " + e + "in handling event " + eventMessage.value);
  }
}// handleEventBusMessage
