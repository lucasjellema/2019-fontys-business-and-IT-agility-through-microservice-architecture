# Running Kafka Event Bus on Kubernetes 

You can continue to run in the Katacoda environment you were using in the previous section, or start it afresh. In case of the latter: open Katacoda's Kubernetes scenario at: [Katacode Launch Single Node Cluster](https://www.katacoda.com/courses/kubernetes/launch-single-node-cluster)

Minikube has been installed and configured in the environment. Minikube is a virtualized Kubernetes cluster instance - that you can also easily run locally on your laptop - that is typically used to study and try out Kubernetes in a small scale environment. 

## Proceed through the scenario
Walk your way through this scenario:
* verify minikube is installed and working correctly
* get information on the Kubernetes Cluster that is running under control of Minikube
* run a deployment on Kubernetes (based on a public Docker Container image)
* run and inspect the Kubernetes Dashboard - a GUI that offers great overview of what is happening on the K8S cluster *Note: stop at step 4; do not press continue.*

## Deploy a Kafka Cluster on the Minikube Kubernetes cluster
First, get hold of the Kubernetes YAML files that will spin up the Kafka Cluster for us.

```
git clone https://github.com/d1egoaz/minikube-kafka-cluster
```
then go into the newly created directory:
```
cd minikube-kafka-cluster
```

Now execute these four statements to create the Kubernetes resources that run the Kafka cluster.
```
kubectl apply -f 00-namespace/

kubectl apply -f 01-zookeeper/

kubectl apply -f 02-kafka/

kubectl apply -f 03-yahoo-kafka-manager/
```

It will take a minute or two before the Kafka Cluster is running. The *kafka-ca1* namespace may look pretty bad for a while in the dashboard, with Pods trying to get started. Sit back, wait for a while and things will improve.

## Running Kafka Manager
When all Pods are green in the dashboard (for namespace *kafka-ca1*), it is time for next moves.

Execute:
```
kubectl get svc --namespace kafka-ca1
```

This should list the services in kafka-ca1 namespace, one of which is kafka-manager. We are looking for the port at which this service is exposed.

Now click on the plus icon and open *Select Port to View on Host 1* ; enter the port number found for the kafka-manager service.

This should open a new browser window, showing the Kafka Manager.
Open the Cluster menu and click on Add Cluster. Add new cluster, and use the following data for *Cluster Zookeeper Hosts*:
`zookeeper-service:2181`. Use the name `kafka` for the Cluster (although frankly any name will do) and press Save.  

Note: this is not the creation of new Kafka cluster but instead the registration with Kafka Manager of an existing cluster.

As our next step, we need to create a Topic on the Kafka Cluster. Click on Topic, then on Create. Set the name to the new topic to `event-bus`. Accept all other default settings and press Create.

## Run an Application with Kafka Interaction on Kubernetes
Now that we have a Kafka Event Bus running on our Kubernetes Cluster, let's try it out. Let's deploy an application that can consume events from the Event Bus as well as one that publishes events to it. These two applications are completely decoupled from each other. They do not know about each other.

In the terminal window, perform these steps:
```
cd ..
git clone https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture
```
This will clone the workshop repository from GitHub, including directory `4-kafka` that we will make use of next.

```
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/4-kafka/
kubectl apply -f ./event-bus-listener/EventBusListenerPod.yaml -f ./event-bus-listener/EventBusListenerService.yaml  

kubectl apply  -f ./event-bus-publisher/EventBusPublisherPod.yaml -f ./event-bus-publisher/EventBusPublisherService.yaml
```
With these commands, you will deploy two Node applications that will act as Kafka clients - for publishing to and consuming from the topic event-bus. Both applications are exposed as service as well; we can list them and find their ports.

```
kubectl get svc
```

Get the port for eventbuslistenerservice and for eventbuspublisherservice

Now click on the plus icon and open *Select Port to View on Host 1* ; enter the port number found for the eventbuslistenerservice. Add /event-bus to the URL in the browser location bar. You will get a list of all events consumed by the Event Bus Listener.

We also open a window for publishing events. Click again on the plus icon and open *Select Port to View on Host 1* ; enter the port number found for the eventbuspublisherservice. Add /publish?payload=helloworld to the URL in the browser location bar. This will publish an event to the event bus.

As an alternative to accessing the services through the browser, you can also use Curl, using a command like the following - after editing and inserting the values applicable to your environment:

curl -X GET \
  'http://<Katacoda host for Event Publisher>/publish?area=belgium&candy=chocolate' \

in my case this evaluates to:
curl -X GET \
  'http://2886795330-30303-frugo04.environments.katacoda.com/publish?area=belgium&candy=chocolate' \

Check the logging for the two Pods for the Event. You should see details on publishing and consuming the events:

*Logs for EventBusPublisher*
```
Running EventBusPublisherversion 0.9.5
Attempting to create client for kafka.kafka-ca1:9092
event-bus
Microservice' + EventBusPublisher  running (version 0.9.5), Express is listening... at  8096  for /ping, /about and /publish calls
[kafka-producer -> event-bus]: broker update success
Published event to topic event-bus :{"event-bus":{"0":1}}
...
Published event to topic event-bus :{"event-bus":{"0":3}}
```

*Logs for EventBusListener*
```
Running EventBusListenerversion 0.8.9
... trying to connect to Kafka at kafka.kafka-ca1:9092
Microservice' + EventBusListener  running (version 0.8.9), Express is listening... at  8096  for /ping, /about and /event-bus calls
here
kafka->  {"news":"The Lastest News of the World"}
received message { topic: 'event-bus',
  value: '{"news":"The Lastest News of the World"}',
  offset: 0,
  partition: 0,
  highWaterOffset: 2,
  key: 'EventBusEvent' }
received message object {"topic":"event-bus","value":"{\"news\":\"The Lastest News of the World\"}","offset":0,"partition":0,"highWaterOffset":2,"key":"EventBusEvent"}
actual event: {"news":"The Lastest News of the World"}
here
kafka->  {"more news":"The Lastest News of the Cluster","comments":"No Comment"}
received message { topic: 'event-bus',
  value:
   '{"more news":"The Lastest News of the Cluster","comments":"No Comment"}',
  offset: 1,
  partition: 0,
  highWaterOffset: 2,
  key: 'EventBusEvent' }
......  
kafka->  {"meta":"Produced by EventBusPublisher (0.9.5) from an HTTP Request","payload":"helloworld"}
received message { topic: 'event-bus',
  value:
   '{"meta":"Produced by EventBusPublisher (0.9.5) from an HTTP Request","payload":"helloworld"}',
  offset: 3,
  partition: 0,
  highWaterOffset: 4,
  key: 'EventBusEvent' }
received message object {"topic":"event-bus","value":"{\"meta\":\"Produced by EventBusPublisher (0.9.5) from an HTTP Request\",\"payload\":\"helloworld\"}","offset":3,"partition":0,"highWaterOffset":4,"key":"EventBusEvent"}
actual event: {"meta":"Produced by EventBusPublisher (0.9.5) from an HTTP Request","payload":"helloworld"}
```

If your output is similar - and the consumer's log has the data you sent from the publisher - then we have what we want: event based, decoupled interaction between applications.