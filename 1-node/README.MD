# RequestCounter Node application in Node Run Time on Linux

Open Katacoda's Node Playground environment at: [Katacode Node Playground](https://www.katacoda.com/courses/nodejs/playground)

## Retrieve application resources
In the terminal window, git clone the workshop GitHub repo with 

```
git clone https://github.com/lucasjellema/2019-fontys-business-and-IT-agility-through-microservice-architecture
```
When the repo is cloned locally, prepare the application further
```
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/1-node

npm install
```
The application is now ready for action. 

## Run the application
Run the Request Counter application using:
```
node requestCounter.js
```
The terminal will show some output, indicating that the application is running, ready to handle http requests at port 300.

Open a second terminal.

In the new terminal window, make an HTTP GET request to the Node application, with:
 
```
curl localhost:3000
```

Repeat this statement a few times. It should be obvious what the application does.

Check the contents of file requestCounter.js in the editor pane above the terminal window. You can edit the file. Changes are saved immediately.

In the first terminal window, you can stop execution of the application with CTRL+C, then restart with
```
node requestCounter.js
```
and see the effect of any changes you have made.

## Run Version 2 of the Application
Although not spectacularly different from the original, we have a version 2 of the application.

With the application running in the first terminal, run this in the second terminal window

```
cd 2019-fontys-business-and-IT-agility-through-microservice-architecture/1-node

node requestCounter-2.js
```
This fails with a port conflict. To be expected of course. However, we would like to have the second version running without first bringing down the first version and making the application unavailable to our end users. As long as both versions want to listen to the same port, they cannot both run. 

Stop version 1 of the Request Counter application from running in terminal 1. Now run the version 2 in terminal 2. 

Back in terminal 1:

```
curl localhost:3000
```

Repeat this statement a few times. CLearly version 2 is running. Still not spectacular.

## Accessing the Request Counter application from a Browser Window

Open a browser window by clicking on the Plus sign at the top of the terminal window and selecting *Select port to view on Client 1*. In the browse window that is displayed, set the port to 3000 and click on button *Display Port*.
 
Now the browser window displays the response from the Node application:
 
You may notice that with each request from the browser, the counter increases by two. Do you know why (not just by one)? Does the same increase by two phenomenon occur when invoking the same URL using curl from the command line?




*Hint: favicon*
