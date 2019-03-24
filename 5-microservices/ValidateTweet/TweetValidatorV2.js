var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser');
var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");
var eventBusPublisher = require("./EventPublisher.js");
var eventBusConsumer = require("./EventConsumer.js");


var workflowEventsTopic = "workflowEvents";
var PORT = process.env.APP_PORT || 8091;
var APP_VERSION = "0.8.6"
var APP_NAME = "TweetValidator"

console.log("Running TweetValidator version " + APP_VERSION);


var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Server running, Express is listening... at ' + PORT + " for /ping, /about and /tweet TweetValidator API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetValidator API, Version " + APP_VERSION);
  res.write("Supported URLs:");
  res.write("/ping (GET)\n;");
  res.write("/tweet (POST)");
  res.write("NodeJS runtime version " + process.version);
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

app.get('/ping', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("Reply");
  res.write("incoming headers" + JSON.stringify(req.headers));
  res.end();
});

app.post('/tweet', function (req, res) {
  // Get the key and value
  console.log('TweetValidator - validate tweet');
  console.log('body in request' + JSON.stringify(req.body));
  console.log("content type " + req.headers['content-type']);
  var tweet = req.body;
  var validation = validateTweet(tweet);
  var responseBody = { "result": validation.result, "motivation": validation.motivation };
  // Send the response
  res.setHeader('Content-Type', 'application/json');
  res.send(responseBody);

});

function validateTweet(tweet) {
  var outcome = {};
  outcome.result = "OK";
  outcome.motivation = "perfectly ok tweet according to our current set of rules";
  var valid = true;
  var reason = "Not OK because:";
  console.log("validate tweet " + JSON.stringify(tweet));
  // if tweet is retweet, then no good
  if (tweet.text.startsWith("RT")) {
    valid = false;
    reason = reason + "Retweets are not accepted. ";
  }
  if (tweet.author == "johndoe" || tweet.author == "john.doe") {
    valid = false;
    reason = reason + "No fake authors (John Doe is not acceptable). ";
  }
  if (tweet.text.indexOf("Trump ") > -1 || tweet.text.toLowerCase().indexOf("brexit") > -1 || tweet.text.toLowerCase().indexOf("elections") > -1) {
    valid = false;
    reason = reason + "No Political Statements are condoned today. ";
  }
  if (tweet.text.indexOf("cloud ") > -1) {
    valid = false;
    reason = reason + "Let's stay with two feet on the ground today - so no references to cloud. ";
  }
  if (!valid) {
    outcome.result = "NOK";
    outcome.motivation = reason;
  }
  return outcome;
}

// configure Kafka interaction
eventBusConsumer.registerEventHandler(workflowEventsTopic, handleWorkflowEvent);

// based on https://hackernoon.com/lets-make-a-javascript-wait-function-fa3a2eb88f11
var wait = ms => new Promise((r, j) => setTimeout(r, ms))

function handleWorkflowEvent(eventMessage) {
  var event = JSON.parse(eventMessage.value);
  console.log("received message", eventMessage);
  console.log("received message object", JSON.stringify(eventMessage));
  console.log("actual event: " + JSON.stringify(event));

  // event we expect is of type workflowEvents
  // we should do something with this event if it contains an action (actions[].type='ValidateTweet' where status ="new" and conditions are satisfied)

  if (containsAction(event))
    localCacheAPI.getFromCache(event.workflowConversationIdentifier, async function (document) {
      console.log("Workflow document retrieved from cache");
      workflowDocument = document;
      // this happens  asynchronously; right now we do not actually use the retrieved document. It does work.       
      var acted = false;
      for (i = 0; i < workflowDocument.actions.length; i++) {
        var action = workflowDocument.actions[i];
        // find action of type ValidateTweet
        if ("ValidateTweet" == action.type) {
          // check conditions
          if ("new" == action.status
            && conditionsSatisfied(action, workflowDocument.actions)) {

            // if satisfied, then validate tweet
            var outcome = validateTweet(workflowDocument.payload);

            // update action in event
            action.status = 'complete';
            action.result = outcome.result;
            // add audit line
            workflowDocument.audit.push(
              { "when": new Date().getTime(), "who": "TweetValidator", "what": "update", "comment": "Tweet Validation Complete" }
            );

            acted = true;
            localLoggerAPI.log("Validated Tweet (outcome:" + JSON.stringify(outcome) + ")"
              + " - (workflowConversationIdentifier:" + workflowDocument.workflowConversationIdentifier + ")"
              , APP_NAME, "info");

          }
        }// if ValidateTweet
        // if any action performed, then republish workflow event and store routingslip in cache
      }//for
      if (acted) {
        workflowDocument.updateTimeStamp = new Date().getTime();
        workflowDocument.lastUpdater = APP_NAME;

        // PUT Workflow Document back  in Cache under workflow event identifier
        localCacheAPI.putInCache(event.workflowConversationIdentifier, workflowDocument,
          function (result) {
            console.log("store workflowevent plus routing slip in cache under key " + event.workflowConversationIdentifier + ": " + JSON.stringify(result));
          });
        // artifical waiting time, 1.5 secs
        await wait(1500)
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
