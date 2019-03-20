# RequestCounter Node application in Docker Run Time on Linux

Open Katacoda's Node Playground environment at: [Katacode Docker Playground](https://www.katacoda.com/courses/docker/playground)

## Retrieve application resources
In the terminal window, git clone the workshop GitHub repo with 

```
git clone https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture
```
When the repo is cloned locally, go to the relevant directory 
```
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/2-docker
```
To check the Docker environment, execute:
```
docker 
```
The Docker engine will show itself.

## Run the Request Counter application in Docker
Run the Request Counter application using:
```
docker run --name request-counter -p 3006:3001 -p 4500:4500 -e APPLICATION_ROOT_DIRECTORY=1-node  -e APP_STARTUP=requestCounter.js -e APP_PORT=3001 -e GITHUB_URL=https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture -d lucasjellema/node-run-live-reload:0.4.3

```
The terminal will show some output, showing Docker downloading the container image and finally running a container based on that image: it will present a long identifier as its final output. This is the container identifier.

Type:
```
docker ps
```
to get a list of all container(s) currently running.

The first section of thsame same container identifier is shown, along with other details about the running container. This shows that the container is listening at port 3006 on the Docker host for requests that are channeled to port 3001 internally inside the Docker. Presumably, the container runs an application - the request counter application we saw before - that handles requests at port 3001.

Try out the application:

```
curl docker:3006
```
By all means, repeat this statement a few times.

To learn what is going on inside the container, we can check the log files - using this command:
```
docker logs request-counter   --follow
```
Use CTRL+C to stop following the logging.

We can even go further and enter into the container, using:
```
docker exec -it request-counter  bash 
```
This opens a Shell inside the container. Look around for example with `ps -ef` to see a list of all processes running *inside the container* . Here you can check the Node application that the container cloned from GitHub when it was starting: `ls /tmp/app/1-node`. Type `exit` to return to the Docker host.


### Container Inage docker-node-run-live-reload
A generic Docker Container Image that can run a Node application from a GitHub URL - and refresh the application upon changes in the GitHub sources (without reloading or even restarting the container)

For more details on the container image used in this section, check out this GitHub Repo: https://github.com/lucasjellema/docker-node-run-live-reload

## Accessing the Request Counter application from a Browser Window

Open a browser window by clicking on the Plus sign at the top of the terminal window and selecting *Select port to view on Host  1*. In the browse window that is displayed, set the port to 3006 and click on button *Display Port*.
 
Now the browser window displays the response from the Node application. In this case, the browser's HTTP request is sent to the Node application running inside the Docker container on the Docker host.


## Run Version 2 of the Application
Although not spectacularly different from the original, we have a version 2 of the application. We can start a second container with version 2, running in parallel to version. As long as the second container does not claim the same ports on the Docker host as the first one.

This statement will run the second container - using ports 3008 and 4502 on the Docker host:
```
docker run --name request-counter-v2 -p 3008:3001 -p 4502:4500  -e APPLICATION_ROOT_DIRECTORY=1-node  -e APP_STARTUP=requestCounter-2.js -e APP_PORT=3001 -e GITHUB_URL=https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture -d lucasjellema/node-run-live-reload:0.4.3
```
Note how this statement instructs the generic Docker container to run requestCounter-2.js.

Use the next statement to check on the status of the application in this new container:
```
docker logs request-counter-v2
```

Send an HTTP request to version 2:
```
curl docker:3008
```
and repeat a few times.

With `docker ps` you can verify which containers are running. Two probably. And you can see for these containers on which images they are based and what ports they expose.

## Some Container Manipulation
Docker containers can be run. Run is a combination really of download image, create container from that image and start the container. Containers can also be stopped and started again. In that case, they lose their memory state but retain their file system state. Containers can also be removed - then there is no trace left of them. Then they can be re-run - which means created again and started - with no link whatsoever to the original container.

Let's check out some of this.

Stop the container with version 1:
```
docker stop request-counter
```

Check with `docker ps` what the situation is now. You can use `docker ps -a` to get a list of all containers - running and stopped.

Try to send a request to the now stopped container:
```
curl docker:3006
```
This will fail.

Meanwhile, the second container is unaffected:
```
curl docker:3008
```

Now start application version 1 again, by starting the container again:
```
docker start request-counter
```

Check with `docker ps` what the situation is now. 

Try to send a request to the restarted container:
```
curl docker:3006
```

The response should be *Request Count: 1* . Regardless of what the count was before you stopped the container. This tells us something about where the count was kept by the application, does it not?

Stopping and starting a container loses its memory state and retains the file system contents. 

## Version 3 - Redis Memory Cache

We can run a Redis in memory cache in a Docker container using this simple statement:
```
docker network create redis-net

docker run --name redis --network redis-net redis
```
This will start up a new container with a Redis instance inside.

Check with `docker ps` in a new terminal window if the container is running and which port it has exposed.

Version 3 of the request counter application is prepared for Redis. That means that it will store the count of the number of requests in the cache rather than in the memory of the container itself. And that should mean that that value can survive container restarts. And that it could be shared potentially by multiple instances of the application.

```
docker run --name request-counter-v3 -p 3010:3001 -p 4504:4500 --network redis-net -e APPLICATION_ROOT_DIRECTORY=1-node  -e APP_STARTUP=requestCounter-3.js -e APP_PORT=3001 -e REDIS_HOST=redis -e REDIS_PORT=6379 -e GITHUB_URL=https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture -d lucasjellema/node-run-live-reload:0.4.3
```

Check with `docker ps` if both containers are running correctly.

You can now invoke version 3 of Request Counter:
```
curl docker:3010
```

And a few more times.

You should see that the request is handled by version 3 of the application. That in itself is not very special. However, the special element we have added in version 3:

* note the current value returned by request counter
* stop the container: `docker stop request-counter-v3`
* try to invoke version 3 of the application `curl docker:3010` - that should fail
* start the container again: `docker start request-counter-v3`
* invoke version 3 of the application `curl docker:3010`; not only should you get a response, you should get the next value of the request counter - picking up from where it left of when you stopped the container. This is the effect of the Redis cache instead of the memory state of the application.

### Run a second instance of Version 3 
Other instances of version 3 of the application can share the Redis cache. 

Let's see this in action. Run a second instance of Version 3 of the Request Counter application.

```
docker run --name request-counter-v3-2 -p 3012:3001 -p 4506:4500 --network redis-net -e APPLICATION_ROOT_DIRECTORY=1-node  -e APP_STARTUP=requestCounter-3.js -e APP_PORT=3001 -e REDIS_HOST=redis -e REDIS_PORT=6379 -e GITHUB_URL=https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture -d lucasjellema/node-run-live-reload:0.4.3
```
Check with `docker ps` how many containers are running now. 

You can now invoke this second incarnation of version 3 of Request Counter:
```
curl docker:3012
```
Even though this container has only just been started and never been invoked before, it returns a number greater than 1. Again, the cache in action.
