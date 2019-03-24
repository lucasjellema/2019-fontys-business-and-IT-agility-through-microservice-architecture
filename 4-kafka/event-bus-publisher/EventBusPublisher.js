var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');
  const kafka = require('kafka-node');
  const config = require('./config');

var PORT = process.env.APP_PORT || 8091;
var APP_VERSION = "0.9.5"
var APP_NAME = "EventBusPublisher"


console.log("Running " + APP_NAME + "version " + APP_VERSION);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log(`Microservice' + ${APP_NAME}  running (version ${APP_VERSION}), Express is listening... at  ${PORT}  for /ping, /about and /publish calls`);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About " + APP_NAME + ", Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/publish?field1=value&field2=value_2 (GET)");
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

app.get('/publish', function (req, res) {
  // create event document using parameters from HTTP GET request
  var event = { "meta": "Produced by " + APP_NAME + " (" + APP_VERSION + ") from an HTTP Request" };
  for (var queryParam in req.query) {
    if (req.query.hasOwnProperty(queryParam)) {
      event[queryParam] = req.query[queryParam];
    } //if
  } //for
  publishEvent(event);
  res.setHeader('Content-Type', 'application/json');
  var document = { "Result": "Published Event to Topic " + config.kafka_topic };
  res.send(JSON.stringify(document));
});

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

function publishEvent(event) {
  km = new KeyedMessage('EventBusEvent', JSON.stringify(event));
  payloads = [
    { topic: kafka_topic, messages: [km], partition: 0 }
  ];
  producer.send(payloads, function (err, data) {
    if (err)
      console.log(`Error in publishing event to topic ${kafka_topic} : ${JSON.stringify(err)}`);
    else
      console.log("Published event to topic " + kafka_topic + " :" + JSON.stringify(data));
  });

}

// publish a test event - after 8 seconds to give the application some time to prepare the Kafka Client
setTimeout( function () {publishEvent({"MyEvent":{"myPayload":"some data","myMOre":"MOre data"}})},8000)