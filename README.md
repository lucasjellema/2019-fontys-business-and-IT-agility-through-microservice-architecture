# Fontys College  Business and IT agility through microservice architecture

1 April 2019, Eindhoven

Business and IT agility through microservice architecture powered by containers and cloud  Evolving architectures, emerging technology and new cloud services enable new ways to address business challenges with IT solutions. Microservices architecture promises flexibility, scalability, and optimal use of compute resources. This lecture introduces the objectives that microservices are expected to realize and explains how microservices will do that. The lecture describes the key concepts – domain driven design, bounded context, events, statelessness and APIs. It discusses and demonstrates a real implementation of microservices using containers and Kubernetes.   Students will do a hands-on with the Kubernetes platform – learning about the container orchestration features that allow microservices to be deployed, scaled, configured, failed over, and upgraded to new versions while maintaining proper routing and load balancing. Students will learn how to make use of Kubernetes for running multiple interacting containers executing applications written in the technology of their choice.  The lectures discusses the service mesh and challenges with tracing and end to end monitoring. The relevance of events for decoupled collaboration is discussed and demonstrated. Concepts discussed include workflow choreography, the CQRS data(base) pattern for cross domain data sharing and serverless architecture. 

[Download Presentation Slides](https://conclusionfutureit-my.sharepoint.com/:p:/g/personal/lucas_jellema_amis_nl/EZK2atJsSuNJmgbC3KZS1dgBZyaM948uNUqvr9S1iFwwMA?e=rD70mw)

## Hands On
The sub folders contain instructions for hands on actions to learn about and play with the concepts and technologies discussed and demonstrated in this lecture.

1. [Introduction of Request Counter Node Application](./1-node/README.MD)
2. [Introduction of Docker - Running Request Counter Node Application as Docker Container](./2-docker/README.MD)
3. [Introduction of Kubernetes - Running Request Counter Node Application as Pod on Kubernetes](./3-kubernetes/README.MD)
4. [Introduction of Kafka - Running Kafka on Kubernetes and producing & consuming messages](./4-kafka/README.MD)
5. [Microservices - Choreography of Microservices on Kafka and Kubernetes](./5-microservices/README.MD)

Before you get going, please inspect the instructions in [Introduction Microservices and Implementing Technology with Docker, Kubernetes, Node.js and Kafka – Hands-on](./AMIS-Workshop-IntroductionMicroservicesPlusTechnology_DockerKubernetesKafkaNodeJS-April2019.pdf). This tells you more about environment.
