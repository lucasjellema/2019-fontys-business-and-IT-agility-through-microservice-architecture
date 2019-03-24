# Run Microservices Architecture on Kubernetes 

In this section, a multi-step workflow is implemented using various microservices that dance together – albeit unknowingly. The choreography is laid down in a workflow prescription that each microservice knows how to participate in.

Start from the situation at the end of the previous section - Katacoda [Katacode Launch Single Node Cluster](https://www.katacoda.com/courses/kubernetes/launch-single-node-cluster) with Kafka running on Minikube, including Kafka Manager (as described in [Event Bus Kafka on Kubernetes](https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture/blob/master/4-kafka/README.MD))

## Two New Kafka Topics
The Kafka Event Bus was introduced in the previous section, and should still or again be running on your Kubernetes cluster. In this Kafka Cluster, use Kafka Manager to create two new topics called `workflowEvents` and `logTopic` respectively.

The workflow choreography takes place through events published to and consumed from the first topic. Logging will be published to the second topic.

## Retrieve Workshop Sources from GitHub
If you are working in an environment that does not yet contain the workshop resouces, then perform

```
git clone https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/5-microservices
```
This will clone the workshop repository from GitHub, including directory `5-microservices` that we will make use of next.

A new namespace called `choreography` is created for all resources associated with this choreography demonstration, from directory 5-microservices:
```
kubectl apply -f namespace.yml
```

## Startup Cache Capability 
In addition to the Kafka Event Bus, our microservices platform also provides a cache facility to the microservices. This cache facility is provided through Redis, by executing these commands:
```
kubectl run redis-cache --image=redis --port=6379 --namespace=choreography
kubectl expose deployment redis-cache --type=NodePort  --namespace=choreography
```
With these commands, a deployment is created on the Kubernetes Cluster with a pod based on Docker Image redis and exposing port 6379. This deployment is subsequently exposed as a service, available for other microservices on the same cluster and for consumers outside the cluster, so we can check on the contents of the cache if we want to. Type ClusterIP instead of NodePort to only allow access to other microservices (pods) on the cluster.

## Inspect the cache contents
A simple cache inspector is available in directory 5-microservices\CacheInspector. You can run the node application CacheInspector.js locally, or you can launch another Pod on Kubernetes using 

```
cd CacheInspector
kubectl create –f CacheInspectorPod.yaml –f CacheInspectorService.yaml
kubectl get svc --namespace=choreography
```

Now click on the plus icon and open *Select Port to View on Host 1* ; enter the port number found for the *cacheinspectorservice*.

This should open a new browser window, showing a message that GET is not support. Add `/cacheEntry?key=TheAnswer` to the URL in the browser bar. This should return a cache entry.

Instead of through the browser, you can also make a curl request to retrieve this information from the CacheInspector:
curl -X GET \
  'http://<Katacoda environment-port CacheInspector Service>/cacheEntry?key=TheAnswer' 


## Run the LogMonitor to inspect the logging produced in microservices
Being able to keep track of what is going on inside the microservices – on a technical, non functional level and on a functional level – is pretty important in order to detect malfunctions and analyze and ultimately resolve any issues. The microservices you will deploy today all produce logging – to a Kafka logTopic. The LogMonitor consumes the log events on this topic and exposes them through a simple web UI. Let’s install the LogMonitor now.

```
cd ../LogMonitor
kubectl create -f LogMonitorPod.yaml  -f LogMonitorService.yaml
```
With this command, a new Pod is launched that consumes the log events on the logTopic and keeps them in memory to make them available to anyone requesting them through a simple HTTP request: http://clusterIP:logMonitorPort/logs

Using kubectl get services you can inspect the service that is created and the port at which it is exposed. 

Now click on the plus icon and open *Select Port to View on Host 1* ; enter the port number found for the *logmonitorservice*.

This should open a new browser window, showing a message that GET is not support. Add `/logs` to the URL in the browser bar. This should return the logs collected by the microservice so far.

## Run Microservice TweetReceiver
The microservice TweetReceiver exposes an API that expects HTTP Post Requests with the contents of a Tweet message. It will publish a workflow event to the Kafka Topic to report the tweet to the microservices cosmos to take care of.

Run:

```
cd ../TweetReceiver
kubectl create -f TweetReceiverPod.yaml  -f TweetReceiverService.yaml
```

With this command, a new Pod is launched that listens for HTTP Requests that report a Tweet. This reporting could be done through a recipe from IFTTT or with a simple call from any HTTP client such as Postman or curl.

Use
```
kubectl get svc --namespace=choreography
```
to find the port assigned to the TweetReceiverService. Using that port, construct the URL for the service and publish a mock Tweet using this curl command:

```
curl -X POST \
  http://<URL for TweetReceiverService>/tweet \
  -H 'Content-Type: application/json' \
  -d '{ "text":"#1 Today is a microservice workshop at Fontys Hogeschool in Eindhoven" 
, "author" : "your name or Twitter handle"
, "authorImageUrl" : "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
, "createdTime" : "April 1st, 2019 at 08:39AM"
, "tweetURL" : "http://twitter.com/SaibotAirport/status/853935915714138112"
, "firstLinkFromTweet" : "https://t.co/cBZNgqKk0U"
}'
```
You can now check the logs - a few will be writte in response to the Tweet. 

## Run Microservice Workflow Launcher
The Workflow Launcher listens to the workflowEvents Kafka Topic for events of type NewTweetEvent. Whenever it consumes one of those, it will compose a workflow event with a workflow choreography definition for that specific tweet. The data associated with the workflow is stored in the cache and thus made available to other microservices. 

Run the Workflow Launcher with:
```
cd ../WorklowLauncher
kubectl create -f WorkflowLauncherPod.yaml
```
Note: the values for the environment variable KAFKA_HOST, ZOOKEEPER_PORT and REDIS_HOST and REDIS_PORT in the yaml file link this microservice to some of its dependencies.

This microservices does not expose an external service – all it does is listen to events on the Kafka Topic [and turn a NewTweetEvent into a Workflow Event with a routing slip for the workflow that has to be executed]. This routing slip is defined in the message variable at the bottom of the file WorkflowLauncher.js. 

When the microservice is running, it will listen for NewTweetEvents (that we know are published by the TweetReceiver). If you check out the logs for WorkflowLauncher in the LogMonitor response, you should find that any request send to TweetReceiver will now lead to activity in the WorkflowLauncher.
 
The WorkflowLauncher creates a workflow instance for which we can read the identifier in the LogMonitor output. Using this identifier, we can retrieve the routing slip from the CacheInspector service.

Note that at this point the workflow instance that is created by the workflow launcher is not processed. There are no microservices available yet to process the activities described in the routing slip. That is about to change.

## Rollout Microservice ValidateTweet
The next microservice takes care of validating tweets. It can do so based on workflow events or in response to direct HTTP requests.

Create and run the microservice :
```
cd
kubectl create -f ValidateTweetPod.yaml
Also to expose an API for this microservice:
kubectl create -f ValidateTweetService.yaml
```

Using kubectl get services you can find out the port at which you can reach this microservice. You can try out the functionality of this microservice with a simple POST request to the url:
```
curl -X POST \
  http://<Katacoda URL for tweetvalidatorservice>/tweet \
  -H 'Content-Type: application/json' \
  -d '{ "text":"RT: Trump brexit Local Tweet  #oraclecode Tweet @StringSection @redCopper" 
             , "author" : "you"
             , "authorImageUrl" : "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
             , "createdTime" : "April 1st, 2019 at 10:13PM"
             , "tweetURL" : "http://twitter.com/SaibotAirport/status/853935915714138112"
             , "firstLinkFromTweet" : "https://t.co/cBZNgqKk0U"
             }'
```             
 
The source code for this microservices is in file 5-microservices/ValidateTweet/TweetValidator.js. In this file, the function handleWorkflowEvent is invoked whenever an event is consumed from the workflowEvents topic. 

The logic in this function inspects the workflow event to find any action of the actionType that this microservice knows how to process – ValidateTweet – and with status new. If it finds such as action, it will check what the condition are that have to be fulfilled in order for this action to per performed (none at present). If an action of the right type with the right status and without unsatisfied conditions is found, the microservice will do its job and execute the action. Subsequently it will update the routing slip and publish a fresh event to the workflowEvents topic.

What we see in action now is one of the promises of the microservices choreography approach: without changing a central orchestration component – because there is none – or any other microservice, we have extended the capability of our application landscape with the ability to participate in the Tweet Workflow. Before too long we will have deployed to additional microservices and at that point the entire workflow can be completed. Without any impact on existing pieces and components. 

After that, we will change the workflow definition – and without changing any of the microservices have the updated workflows executed by the existing microservices. We can also take down one or more of the microservices – and after a little while start the up again, with the same or a changed implementation. While they are down, the execution of the workflows ceases. But as soon as the microservice is started, it will go an consume all pending events on the workflowEvents topic and start processing them – if it can.

## Run Microservice to Enrich Tweet
This microservice takes the tweet and enriches it with information about the author, any acronyms and abbreviations, related tweets and many more details. Well, that was the intent. And could still happen. But for now all the enrichment that takes place is very limited indeed. Sorry about that. However, this microservice will play its designated role in the workflow execution, according to the choreography suggested by the workflow launcher.

Run the microservice:

```
cd ../TweetEnricher 
kubectl create -f TweetEnricherPod.yaml

kubectl create -f TweetEnricherService.yaml
``` 
This microservice consumes new workflowEvents and searches through them for actions of type *EnrichTweet* that are available for execution. If it finds such actions, it will execute them.

## Run Microservice TweetBoard
The last microservice we discuss does two things: 
1.	it responds to events in the workflow topic of type TweetBoardCapture (by adding an entry for the tweet in the workflow document) and 
2.	it responds to HTTP Requests for the current tweet board [contents] by returning a JSON document with the most recent (maximum 25) Tweets that were processed by the workflow

This microservice is stateless. It uses the cache in the microservices platform to manage a document with the most recent tweets.
Run a Pod on Kubernetes with this microservice using this command:
```
cd ../TweetBoard
kubectl create -f TweetBoardPod.yaml
```
and expose the microservice as a Service:
```
kubectl create -f TweetBoardService.yaml
```
This microservice looks for workflowEvents and searches actions of type TweetBoardCapture that are available for execution. If it finds such actions, it will execute them.

All actions in the routing slips of workflow instances can now be executed by the available microservices.
Inspect the port assigned to this microservice using `kubectl get services --namespace choreograhy`. Then access the microservice at http://<Katacoda environment - assigned port>/tweetBoard. You will not yet see any tweets on the tweet board.

However, as soon as you publish a valid tweet to the TweetReceiver micro service, the workflow is initiated and through the choreographed dance that involves Workflow Launcher, TweetValidator, TweetEnricher and TweetBoard, that tweet will make its appearance on the tweet board.
Publish a few tweets to TweetReceiver and inspect the tweet board again. 

```
curl -X POST \
  http://<Katacoda URL for tweetvalidatorservice>/tweet \
  -H 'Content-Type: application/json' \
  -d '{ "text":"I want to share this news with you ... " 
             , "author" : "you"
             , "authorImageUrl" : "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
             , "createdTime" : "April 1st, 2019 at 10:39PM"
             , "tweetURL" : "http://twitter.com/SaibotAirport/status/853935915714138112"
             , "firstLinkFromTweet" : "https://t.co/cBZNgqKk0U"
             }'
```             
# Optional next steps
Some obvious next steps around this workflow implementation and the microservices platform used are listed below:
•	Expose TweetReceiver to the public internet (for example using ngrok) and create an IFTTT recipe to invoke the TweetReceiver for selected tweets; this allows the workflow to act on real tweets
•	Run multiple instances (replicas) of the Pods that participate in the workflow (note: they are all stateless and capable of horizontally scaling; however, here is not currently any (optimistic) locking implemented on cache access, so race conditions are - although rare - still possible!)
•	Change the workflow
o	create a new workflow plan that for example changes the sequence of validation and enrichment or even allows them to be in parallel (see example below)
o	add a step to the workflow (and a microservice to carry out that step)
•	Implement one or more microservices on a cloud platform instead of on the local Kubernetes cluster; that requires use of an event bus on the cloud (e.g. Kafka on the cloud, such as CloudKarafka) and possibly (if the local Kafka is retained as well) a bridge between the local and the cloud based event bus.

## Change the Workflow
A somewhat updated version of the Tweet Workflow is available in 5-microservices\WorkflowLauncher\WorkflowLauncherV2.js. In this version, Enrichment is done before Validation. This is defined in the message variable at the bottom of the program.
You can force replace the pod currently running on Kubernetes for workflow-launcher-ms 
```
cd ../WorkflowLauncher
kubectl replace -f WorkflowLauncherV2Pod.yaml --force
``` 
to try this later version of the workflow.

Publish a new tweet to TweetReceiver. Now when you inspect the workflow document in the cache (through the CacheInspector) you will find that in the latest workflow, enrichment is done before validation.

## Add Tweet Translation to the Workflow
A more substantial change is the next one, where we introduce a translation of the tweets, into several popular languages. 
 
We first create a microservice called TweetTranslator that can perform the translation of tweets and that can consume workflow events from the Kafka topic. Next, we will update the workflow definition to also include the translation of the tweet: 

```
cd ../TweetTranslator
kubectl apply -f TweetTranslatorPod.yaml –f TweetTranslatorService.yaml
```
This creates a Pod for the TweetTranslator microservice as well as a Service that exposes the translation capabilities. The microservices listens to the workflowEvents topic – for any workflowEvents for a workflow instance that it can make a contribution to. And it can handle direct HTTP requests.

Use `kubectl get services --namespace choreography` to find out the port at which the TweetTranslator microservice is exposed.

Now can you  see the translation of the Tweet in action with this curl call:
```
curl -X POST \
  http://<Katacoda environment - Service Port>/tweet \
  -H 'Content-Type: application/json' \
  -d '{ "text":"The message I want to share should be translated in as many languages as possible - it is Great, the greatest or is it fake,the fakest" 
, "author" : "you again"
, "authorImageUrl" : "http://pbs.twimg.com/profile_images/427673149144977408/7JoCiz-5_normal.png"
, "createdTime" : "April 1st, 2019 at 11:15PM"
, "tweetURL" : "http://twitter.com/SaibotAirport/status/853935915714138112"
, "firstLinkFromTweet" : "https://t.co/cBZNgqKk0U"
}'
``` 

A somewhat updated version of the Tweet Workflow is available in 5-microservices\WorkflowLauncher\ WorkflowLauncherV3.js. In this version, Translation is added to the workflow after validation. This is defined in the message variable at the bottom of the program. Take a look at definition of var message in the source of WorkflowLauncherV3.js – and try to understand the updated definition of the routing slip:
 
You can force replace the pod currently running on Kubernetes for workflow-launcher-ms 
```
cd ../WorkflowLauncher
kubectl replace -f WorkflowLauncherV3Pod.yaml --force
```

Publish a new tweet to TweetReceiver. Now when you inspect the workflow document in the cache (through the CacheInspector using the workflowConversationIdentifier that you have learned through the LogMonitor) you will find that in the latest workflow, translation has been done. When you retrieve tweets from the TweetBoard, you will also find the translations in the final outcome of the workflow.
