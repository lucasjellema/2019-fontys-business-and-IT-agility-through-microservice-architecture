var kafka = require('kafka-node')
var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');

var kafkaHost = process.env.KAFKA_HOST || "ubuntu";
var zookeeperPort = process.env.ZOOKEEPER_PORT || 2181;

var Consumer = kafka.Consumer
var Producer = kafka.Producer
KeyedMessage = kafka.KeyedMessage;

var kafkaTopic = process.env.KAFKA_TOPIC || "workflowEvents";
var client;
var consumer;
var PORT = process.env.APP_PORT || 8096;
var APP_VERSION = "0.8.3"
var APP_NAME = "EventBusListener"


console.log("Running " + APP_NAME + "version " + APP_VERSION);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice' + APP_NAME + ' running, Express is listening... at ' + PORT + " for /ping, /about and /event-bus calls");
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
  var document = { "topic": kafkaTopic , "events": events};
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(document));
});

var events = [];

var consumerOptions = {
  host: kafkaHost + ":"+zookeeperPort,
  groupId: 'event-bus-listener',
  sessionTimeout: 15000,
  protocol: ['roundrobin'],
  fromOffset: 'earliest' // equivalent of auto.offset.reset valid values are 'none', 'latest', 'earliest'
};

function onMessage(message) {
  console.log('%s read msg Topic="%s" Partition=%s Offset=%d'
  , this.client.clientId, message.topic, message.partition, message.offset);
  handleEventBusMessage(message);

}

function onError(error) {
  console.error(error);
  console.error(error.stack);
}

process.once('SIGINT', function () {
  async.each([consumerGroup], function (consumer, callback) {
      consumer.close(true, callback);
  });
});


function initializeKafkaConsumer(attempt) {
  var topics = [kafkaTopic];
  var consumerGroup = new kafka.ConsumerGroup(Object.assign({ id: 'consumerLocal' }, consumerOptions), topics);
  consumerGroup.on('error', onError);
  consumerGroup.on('message', onMessage);
  
  consumerGroup.on('connect', function () {
      console.log('connected to ' + kafkaTopic + " at " + consumerOptions.host);
  })
  

}//initializeKafkaConsumer

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
