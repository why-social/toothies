import mqtt, { IClientOptions, IClientPublishOptions, MqttClient } from "mqtt";
import { typeFromString, ServiceType } from "../types/ServiceType";
import { ServicesList } from "../types/ServicesList";
import { Service } from "../types/Service";
import { ResponseListener } from "./ResponseListener";
import { MqttRequest, MqttResponse } from "./MqttMessages";
import uniqid from "uniqid";

export class ServiceBroker {
  private serviceMap: Map<ServiceType, ServicesList> = new Map(); // TODO enum instead of string?
  private static readonly heartbeatTopic = "heartbeat/+";
  private static readonly heartbeatRx = /^heartbeat\/(\w+)$/;
  private static readonly mqttOptions: IClientOptions = {
    username: "service",
    password: "Ilike2makewalks",
  };
  private readonly messageListeners: Map<
    string,
    (topic: string, message: Buffer) => void
  > = new Map();

  private readonly mqttClient: MqttClient;

  constructor() {
    this.mqttClient = mqtt.connect(
      "tls://0fc2e0e6e10649f790f059e77c606dfe.s1.eu.hivemq.cloud:8883",
      ServiceBroker.mqttOptions,
    );
    this.mqttClient.on("error", (error) => {
      console.error("Mqtt error:", error);
      this.mqttClient.end();
    });

    this.mqttClient.on("connect", () => {
      console.log("Connected to MQTT broker");
    });
  }

  public subscribe(topic: string, cb: (t: string, m: Buffer) => void) {
    this.mqttClient.subscribe(topic, (err) => {
      if (err) {
        throw new Error("Failed to subscibe to " + topic);
      }
      console.log("Subscribed to " + topic);
    });

    this.mqttClient.on("message", cb);
    this.messageListeners.set(topic, cb);
  }

  public unsubscribe(topic: string) {
    this.mqttClient.unsubscribe(topic, (err) => {
      if (err) {
        throw new Error("Failed to unsubscibe from " + topic);
      }
      console.log("Unsubscribed from " + topic);
    });

    const cb = this.messageListeners.get(topic);
    if (cb) {
      this.mqttClient.off("message", cb);
    } else {
      console.error(
        "Could not remove listener while unsubscibing from " + topic,
      );
    }
    this.messageListeners.delete(topic);
  }

  public publishToService(
    service: ServiceType,
    topic: string,
    message: Object,
    cb: ResponseListener,
  ) {
    const options: IClientPublishOptions = { qos: 2 };
    const timeoutDuration = 3000;
    let retries = 0;
    const servicesList = this.serviceMap.get(service);
    if (!servicesList) {
      cb.onServiceError("No available services");
      return;
    }
    const maxRetries = servicesList.getServicesCount();

    const reqTimestamp = Date.now(); // timestamp to identify req and res
    const reqId = uniqid();
    let requestMessage = JSON.stringify({
      timestamp: reqTimestamp,
      reqId: reqId,
      data: { ...message },
    });

    const publishRequest = (serviceId: string) => {
      const publishTopic = `${serviceId}/${topic}`;
      const responseTopic = `res/${reqId}`;

      // handler for receiving a response from a service.
      // expects a response message on the topic '${serviceId}/res/${reqTimestamp}'
      const responseHandler = (topic: string, message: Buffer) => {
        if (topic === responseTopic) {
          clearTimeout(timeout);
          this.mqttClient.removeListener("message", responseHandler);
          this.mqttClient.unsubscribe(responseTopic);
          console.log(`Received response: ${message.toString()}\n`);
          cb.onResponse(JSON.parse(message.toString()) as MqttResponse);
          return;
        }
      };

      // subscribe and attach response handler
      this.mqttClient.subscribe(responseTopic);
      this.mqttClient.on("message", responseHandler);

      this.mqttClient.publish(publishTopic, requestMessage, options, (err) => {
        if (err) return cb.onServiceError("Failed to publish request message");
        console.log(`Published request: ${requestMessage} to ${publishTopic}`);
      });

      const timeout = setTimeout(() => {
        console.log(
          `Request to service ${serviceId} timed out. Redirecting to another service...`,
        );
        this.mqttClient.removeListener("message", responseHandler);
        this.mqttClient.unsubscribe(responseTopic);
        retries++;
        if (retries < maxRetries) {
          const newServiceId = servicesList
            .getRoundRobinService()
            ?.getServiceId();
          if (newServiceId) {
            publishRequest(newServiceId);
          } else {
            cb.onServiceError("No available services to handle the request");
            console.log("No available services to handle the request\n");
          }
        } else {
          cb.onServiceError("Request timed out after multiple retries");
          console.log("Request timed out after multiple retries\n");
        }
      }, timeoutDuration);
    };
    const initialServiceId = servicesList
      .getRoundRobinService()
      ?.getServiceId();
    if (initialServiceId) {
      publishRequest(initialServiceId);
    } else {
      cb.onServiceError("No available services to handle the request");
      console.log("No available services to handle the request\n");
    }
  }

  public fromHeartbeat(serviceString: string, message: string) {
    const serviceType = typeFromString(serviceString);
    if (!serviceType) {
      throw new Error("Invalid service type when adding to manager.");
    }

    const msgService: Service = Service.fromJSON(message.toString());
    const serviceId = msgService.getServiceId();
    const containerName = msgService.getContainerName();

    if (!this.serviceMap.has(serviceType)) {
      this.serviceMap.set(serviceType, new ServicesList());
    }

    let servicesList = this.serviceMap.get(serviceType);
    if (!servicesList) {
      // This cannot possibly happen, but TS forced my hand
      console.error("If you see this, something terrible happened");
      return;
    }

    if (!servicesList.hasService(serviceId)) {
      servicesList.addService(msgService);
      console.log(`Discovered service ${serviceId} (${serviceType})`);
    } else {
      servicesList.updateHeartbeat(serviceId);
    }
  }
}
