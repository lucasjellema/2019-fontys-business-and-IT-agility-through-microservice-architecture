var http = require('http'),
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser')
translateGoogle = require('google-translate-api');
;

var localCacheAPI = require("./local-cache-api.js");
var localLoggerAPI = require("./local-logger-api.js");
var eventBusPublisher = require("./EventPublisher.js");
var eventBusConsumer = require("./EventConsumer.js");

var workflowEventsTopic = "workflowEvents";
var PORT = process.env.APP_PORT || 8099;
var APP_VERSION = "0.1.9"
var APP_NAME = "TweetTranslator"

var TweetTranslatorActionType = "TranslateTweet";

console.log("Running " + APP_NAME + " version " + APP_VERSION);

var app = express();
var server = http.createServer(app);
server.listen(PORT, function () {
  console.log('Microservice ' + APP_NAME + 'running, Express is listening... at ' + PORT + " for /ping, /about and /tweet translation API calls");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
app.get('/about', function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write("About TweetTranslator API, Version " + APP_VERSION);
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
  return new Promise(function (resolve, reject) {
    // Get the key and value

    console.log('TweetTranslator - translate tweet');
    console.log('body in request' + JSON.stringify(req.body));
    console.log("content type " + req.headers['content-type']);
    var tweet = req.body;
    translate(tweet).then((translatedTweet) => {
      var responseBody = { "translatedTweet": translatedTweet };
      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.send(responseBody);
    })
    resolve();
  })// Promise
});

function translate(translatingTweet) {

  return new Promise((resolve, reject) => {
    translatingTweet.translations = [];
    Promise.all([
      translateGoogle(translatingTweet.text, { from: "en", to: 'de' })
      , translateGoogle(translatingTweet.text, { from: "en", to: 'es' })
      , translateGoogle(translatingTweet.text, { from: "en", to: 'fr' })
      , translateGoogle(translatingTweet.text, { from: "en", to: 'nl' })
    ]).then((translations) => {
      localLoggerAPI.log("translate  - all translations are in :" + JSON.stringify(translations) + ")"
        , APP_NAME, "info");

      translations.forEach((val) => {
        translatingTweet.translations.push(val.text);
      });
      localLoggerAPI.log("translate - resolve :)"
        , APP_NAME, "info");
      resolve(translatingTweet);
    }) //then
  })//promise
}//translate

// configure Kafka interaction
eventBusConsumer.registerEventHandler(workflowEventsTopic, handleWorkflowEvent);

function containsAction(event) {
  if (event.actions) {
    var acted = false;
    var workflowDocument;
    for (i = 0; i < event.actions.length; i++) {
      var action = event.actions[i];
      // find action of type ValidateTweet
      if (TweetTranslatorActionType == action.type) {
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
  // we should do something with this event if it contains an action (actions[].type=TweetTranslatorActionType where status ="new" and conditions are satisfied)
  try {
    if (containsAction(event))
      localCacheAPI.getFromCache(event.workflowConversationIdentifier, async function (document) {
        console.log("Workflow document retrieved from cache");
        workflowDocument = document;
        var acted = false;
        for (i = 0; i < workflowDocument.actions.length; i++) {
          var action = workflowDocument.actions[i];
          // find action of type TranslateTweet
          if (TweetTranslatorActionType == action.type) {
            // check conditions
            if ("new" == action.status
              && conditionsSatisfied(action, workflowDocument.actions)) {
              var currentAction = action;
              localLoggerAPI.log("handleWorkflowEvent : "
                , APP_NAME, "info");

              var translatedTweet = await translate(workflowDocument.payload);
              workflowDocument.payload = translatedTweet;
              // update action in event
              currentAction.status = 'complete';
              currentAction.result = 'OK';
              // add audit line

              workflowDocument.audit.push(
                { "when": new Date().getTime(), "who": "TweetTranslator", "what": "update", "comment": "Tweet Translation Performed" }
              );
              acted = true;
              if (acted) {
                workflowDocument.updateTimeStamp = new Date().getTime();
                workflowDocument.lastUpdater = APP_NAME;

                localLoggerAPI.log("Translated Tweet  - (workflowConversationIdentifier:" + event.workflowConversationIdentifier + ")"
                  , APP_NAME, "info");
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
            }
          }// if TranslateTweet type
          // if any action performed, then republish workflow event and store routingslip in cache
        }//for
      })// if 
  } catch (err) {
    localLoggerAPI.log("handleWorkflowEvent : EXCEPTION " + err
      , APP_NAME, "info");

  }
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

setTimeout(() => { localLoggerAPI.log("Running " + APP_NAME + " version " + APP_VERSION, APP_NAME, "info") }, 2500);
