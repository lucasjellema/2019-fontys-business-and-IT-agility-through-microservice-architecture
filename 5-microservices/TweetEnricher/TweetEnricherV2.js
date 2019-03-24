var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');
var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");
var eventBusPublisher = require("./EventPublisher.js");
var eventBusConsumer = require("./EventConsumer.js");

var workflowEventsTopic = "workflowEvents";
var PORT = process.env.APP_PORT || 8098;
var APP_VERSION = "1.0.1"
var APP_NAME = "TweetEnricher"

var TweetEnricherActionType = "EnrichTweet";

console.log("Running " + APP_NAME + " version " + APP_VERSION);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice ' + APP_NAME + 'running, Express is listening... at ' + PORT + " for /ping, /about and /tweet Enrichment API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetEnricher API, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/tweet (POST)");
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

app.post('/tweet', function (req, res) {
  // Get the key and value
  console.log('TweetEnricher - enrich tweet');
  console.log('body in request' + JSON.stringify(req.body));
  console.log("content type " + req.headers['content-type']);
  var tweet = req.body;
  var enrichedTweet = enrich(tweet);
  var responseBody = { "enrichedTweet": enrichedTweet };
  // Send the response
  res.setHeader('Content-Type', 'application/json');
  res.send(responseBody);

});

function enrich(tweet) {
  console.log("enrich tweet " + JSON.stringify(tweet));
  tweet.enrichment = "Lots of Money";
  tweet.extraEnrichment = "Even more loads of money, gold, diamonds and even some spiritual enrichment";
  return tweet;
}

// configure Kafka interaction
eventBusConsumer.registerEventHandler(workflowEventsTopic, handleWorkflowEvent);


function containsAction(event) {
  if (event.actions) {
    var acted = false;
    var workflowDocument;
    for (i = 0; i < event.actions.length; i++) {
      var action = event.actions[i];
      // find action of type ValidateTweet
      if (TweetEnricherActionType == action.type) {
        // check conditions
        if ("new" == action.status) return true
      }
    }//for
  }
  return false;
}

// based on https://hackernoon.com/lets-make-a-javascript-wait-function-fa3a2eb88f11
var wait = ms => new Promise((r, j) => setTimeout(r, ms))


function handleWorkflowEvent(eventMessage) {
  var event = JSON.parse(eventMessage.value);
  console.log("received message", eventMessage);
  console.log("actual event: " + JSON.stringify(event));

  // event we expect is of type workflowEvents
  // we should do something with this event if it contains an action (actions[].type='EnrichTweet' where status ="new" and conditions are satisfied)

  if (containsAction(event))
    localCacheAPI.getFromCache(event.workflowConversationIdentifier, async function (document) {
      console.log("Workflow document retrieved from cache");
      var workflowDocument = document;
      var acted = false;
      for (i = 0; i < workflowDocument.actions.length; i++) {
        var action = workflowDocument.actions[i];
        // find action of type EnrichTweet
        if (TweetEnricherActionType == action.type) {
          // check conditions
          if ("new" == action.status
            && conditionsSatisfied(action, workflowDocument.actions)) {
            // if satisfied, then validate tweet
            var enrichedTweet = enrich(workflowDocument.payload);
            workflowDocument.payload = enrichedTweet;
            // update action in event
            action.status = 'complete';
            action.result = 'OK';
            // add audit line
            workflowDocument.audit.push(
              { "when": new Date().getTime(), "who": "TweetEnricher", "what": "update", "comment": "Tweet Enrichment Performed" }
            );

            acted = true;
          }
        }// if EnrichTweet
        // if any action performed, then republish workflow event and store routingslip in cache
      }//for
      if (acted) {
        workflowDocument.updateTimeStamp = new Date().getTime();
        workflowDocument.lastUpdater = APP_NAME;

        localLoggerAPI.log("Enriched Tweet  - (workflowConversationIdentifier:" + event.workflowConversationIdentifier + ")"
          , APP_NAME, "info");

        // PUT Workflow Document back  in Cache under workflow event identifier
        localCacheAPI.putInCache(event.workflowConversationIdentifier, workflowDocument,
          function (result) {
            console.log("store workflowevent plus routing slip in cache under key " + event.workflowConversationIdentifier + ": " + JSON.stringify(result));
          });
        // artifical waiting time, 1.0 secs
        await wait(1000)

        // publish event
        eventBusPublisher.publishEvent('OracleCodeTwitterWorkflow' + workflowDocument.updateTimeStamp, workflowDocument, workflowEventsTopic);
      }// acted
    })
  // if contains actions
}// handleWorkflowEvent

function conditionsSatisfied(action, actions) {
  var satisfied = true;
  // verify if conditions in action are methodName(params) {
  //   example action: {
  //   "id": "CaptureToTweetBoard"
  // , "type": "TweetBoardCapture"
  // , "status": "new"  // new, inprogress, complete, failed
  // , "result": "" // for example OK, 0, 42, true
  // , "conditions": [{ "action": "EnrichTweetWithDetails", "status": "complete", "result": "OK" }]
  for (i = 0; i < action.conditions.length; i++) {
    var condition = action.conditions[i];
    if (!actionWithIdHasStatusAndResult(actions, condition.action, condition.status, condition.result)) {
      satisfied = false;
      break;
    }
  }//for
  return satisfied;
}//conditionsSatisfied

function actionWithIdHasStatusAndResult(actions, id, status, result) {
  for (i = 0; i < actions.length; i++) {
    if (actions[i].id == id && actions[i].status == status && actions[i].result == result)
      return true;
  }//for
  return false;
}//actionWithIdHasStatusAndResult

