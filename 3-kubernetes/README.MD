# Managing RequestCounter Node Application on Kubernetes 

Open Katacoda's Kubernetes scenario at: [Katacode Launch Single Node Cluster](https://www.katacoda.com/courses/kubernetes/launch-single-node-cluster)

Minikube has been installed and configured in the environment. Minikube is a virtualized Kubernetes cluster instance - that you can also easily run locally on your laptop - that is typically used to study and try out Kubernetes in a small scale environment. 

## Proceed through the scenario
Walk your way through this scenario:
* verify minikube is installed and working correctly
* get information on the Kubernetes Cluster that is running under control of Minikube
* run a deployment on Kubernetes (based on a public Docker Container image)
* run and inspect the Kubernetes Dashboard - a GUI that offers great overview of what is happening on the K8S cluster *Note: stop at step 4; do not press continue.*

Check the logs from the Pod first-deployment-<unique id>. Not because they are extremely interesting, but to get a feel for that you can do it. 

We can do similar things from the command line, using kubectl:
`kubectl logs <POD-identifier> -f`
we can read the live logging from the Pod.

## Retrieve application resources
In the terminal window, git clone the workshop GitHub repo with 

```
git clone https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture
```
When the repo is cloned locally, go to the relevant directory 
```
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/3-kubernetes
```
To check the Kubernetes environment, execute:
```
kubectl version
```
The Kubernetes environment will reveal itself.


## Run the Request Counter application on Kubernetes

The file pod.yaml contains the description of a Pod that Kubernetes can deploy. The Pod runs a container based on the image specified in the yaml file. It exposes the application port. We cannot get to that port - other containers inside the Pod can do that. In order to access the application, we need to define a Kubernetes service resource that exposes a port and links it to the container port.

First, on the command line, execute 

```
kubectl apply -f pod.yaml
```

This creates a new Pod based on a familiar container image retrieving and running the request counter application.
Check the Pod creation in the Dashboard or through `kubectl logs`.

Next, create the Service resouce by executing:
```
kubectl apply -f service.yaml
```

When the creation is complete, you can check the service in the dashboard or using `kubectl get svc`.

The service is configured to expose port 8001 (internally within the K8S cluster) and also expose it as a NodePort - to external consumers. You will find the port number assigned by Kubernetes, mapped to port 8001.

Invoke the request counter application in one of two ways:

```
curl minikube:<[port assigned to service]>
```
or: From the Plus sign in the tab menu for the editor, *Select Port to View on Host 1*  and enter the port assigned to the service. 

Note: the initial Pod creation can take up to 90 seconds - because the container image has to be downloaded to the K8S cluster.

In both cases, you will see the response from the Node application running in the container inside the Pod exposed by the Service on the Kubernetes cluster.

From the Pod details page in the dashboard, you can also open an Exec window, right into the container. Just as we did with `docker exec -it bash` in the Docker environment, we can execute commands in the running container.

Using
```
kubectl exec -it <POD identifier> -- /bin/bash
```
we can open a shell window into the container (most containers, as unfortunately the first-deployment container does not seem to allow it)


## Using Kubernetes Deployment to control Scaling and Recovery
We will move to a next level. For that we need to remove the stand alone pod. Execute:
```
kubectl delete -f pod.yaml
kubectl delete -f service.yaml
```

This removes the Pod and the Service. 

We will now make use of the Kubernetes Deployment Resource. We can run an application by creating a Kubernetes Deployment object, and we can describe such a Deployment in a YAML file. Through Deployments, multiple replicas of a Pod can be started and managed by Kubernetes. These instances can be exposed under a single external IP, with Kubernetes taking care of routing incoming traffic to one of the Pods.

Execute this command - to deploy to the K8S cluster all resources defined in the file deployment.yaml.

```
kubectl apply -f deployment.yaml
```

Check in the Dashboard what is created:
* a deployment
* a replica set
* a Pod

or check with this command to display information about the Deployment:

```
kubectl describe deployment request-counter-ms-deployment
```
In the end, it is still the Pod that handles the work. Check the logs for the Pod and when it is ready to handle requests, we can go invoke the service again. First, expose the deployment - akin to creating a service resource for the deployment.

Execute:
```
kubectl expose deployment request-counter-ms-deployment --type=NodePort
```
Now check on the service created as a result using
```
kubectl get svc
```

This will tell you the IP address to which the container port has been mapped. Invoke the requestCounter, again with a request like this:

```
curl minikube:<[port assigned to service]>
```

The role of the deployment and derived replicaset is to control the Pod: to ensure the correct number of Pods is running and to restart a Pod when its predecessor has failed. Also to help execute a smooth transition between application versions.

Now we will scale up the number of replicas – i.e. the number of container instances that is running on the cluster. This can be done by editing the deployment.yaml file and using kubectl apply -f deployment.yaml – or through the Dashboard.

Click on the node Deployments in the navigator. Open the drop down menu for the deployment request-counter-ms-deployment and click on View/edit YAML. Change the value of the attribute replicas from 1 to 2 and click on Update.

You will see that the deployment has now 2 pods. The change is pending – as indicated by the icon on the left hand side. A new Pod is started. After all, we have specified that the desired number of Pods is two and before there was only a single Pod running. After a little while, two pods are running, the desired state (provided there are enough physical resource available).

You can access the microservice again from the browser, or you can do so using curl from the command line.

```
curl minikube:<[port assigned to service]>
```

If you execute this command a number of times, you will see numbers that are not in neat increasing order. It should not be hard to determine why this is so.

With two Pods running and a Service doing load balancing across the pods, some of our requests are handled by one Pod, and other by the other. The two Pods are not collaborating - they each exist on their own.

If you look at the code of /1-node/requestCounter-2.js – the application running in the pods – it is not hard to spot the flaw: these applications are not stateless and therefore do not support horizontal scaling.

Delete one of the pods, for example in the Dashboard. 
 
You will see a new Pod being created immediately. In the deployment definition we stated two replicas are required – and that is what Kubernetes ensures.

Now once more access the microservice a few times, using curl. The value 1 is obviously returned by the newly instantiated Pod.


## Adding a Cache to the Microservices Platform and running a Stateless version of RequestCounter
Just as we did in he hands on section with Docker, we will bring in Redis to be the cross Pod shared memory or state-holder, allowing our application to be stateless and horizontally scalable. 

Create a new pod with Redis in it

```
kubectl run redis-cache --image=redis --port=6379
```
This downloads the container image for Redis and creates and starts a Pod based on it.

Expose Redis within cluster to make it available to other Pods:
```
kubectl expose deployment redis-cache --type=ClusterIP
```

From the command line we can inspect the services exposed on our minikube cluster:
```
kubectl get svc
```

including the new Redis service and its IP address within the cluster.

The hostname for the Redis cache service inside the cluster is redis-cache and the port is 6379 – at this endpoint, other pods in the cluster can access the service.

Upgrade deployment RequestCounter to version with Redis backing. V3: no lock, v4: optimistic lock

```
kubectl apply -f deployment-v2.yaml --record
```

Check on the status of the rollout of the change:

```
kubectl rollout status deployment request-counter-ms-deployment
```

We can inspect the history of a specific deployment and see which changes have been applied to it:

```
kubectl rollout history deployment request-counter-ms-deployment
```

In the dashboard, if we are quick we can see the pods being restarted. If we are not so fast, we can see both pods running (again) – having been restarted fairly recently. Both Pods are running again, from the logs you can tell that both are running the new version of the application – powered by Redis.

And from the command line we can do the curl thing a few times: 
curl minikube:<port exposed by service>
 
This time round, we do not get two counters incrementing in the background. Just a single incrementing value. And supposedly, that value is stored in the Redis cache where both instances access and manipulate it. That should mean that we can stop and (re)start one or even both pods and then continue with the count as though nothing happened. Let’s try that out. Stop one of the pods on the commandline with kubectl or in the dashboard. Note: get the name of the Pod in your case from either the command line using kubectl get pods or through the dashboard.

```
kubectl delete pod request-counter-ms-deployment-68346987-qxv6v --grace-period=60
```

In the dashboard we can see how a new pod is started – because in the deployment we specified 2 replicas to always be running. A little bit later the Pod we asked to have deleted is gone. We can also delete our other pod, to be sure any state lingering in the original pods is gone

Again, we see a new pod running and the old instance being terminated. At this point, both original pods are gone. If we access the request counter microservice, we will find that the counting continues where it had left off.

Of course now we have moved the burden of state to the Redis pod. If we restart that pod, we will get a reset in the counter value, because currently the cache is not persisted outside the container and its contents vanishes when the container dies. Note that we can have Redis be persisted to files outside container.

```
kubectl delete pod <name of redis-cache-… pod>
```

A new pod will be started after a few seconds and the old one terminated. When we then access the microservice requestcounter, the inevitable has happened: a counter reset. The old value was lost when the Redis cache pod was terminated:



# Resources

See: https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services---service-types on services in Kubernetes

Port forwarding from host to Redis Pod: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/

Rolling updates with K8s deployment: https://tachingchen.com/blog/Kubernetes-Rolling-Update-with-Deployment/

Graceful shutdown of pods: https://pracucci.com/graceful-shutdown-of-kubernetes-pods.html 


## Useful Kubectl commands
To see the logs from a specific pod:
```
kubectl logs <name of pod>
```

To open a shell in the running container in a pod with only one container (see: https://kubernetes.io/docs/tasks/debug-application-cluster/get-shell-running-container/) :

```
kubectl exec –it <name of pod> -- bash   
```
Type exit in the shell to return.

Run a command in the container in a Pod:

```
kubectl exec <name of pod> command
```

To open a shell in a running container in a pod with multiple containers:

```
kubectl exec –it <name of pod> -c <name of container> -- bash
```

See the API reference for Kubectl exec for more details: https://kubernetes.io/docs/user-guide/kubectl/v1.6/#exec   
