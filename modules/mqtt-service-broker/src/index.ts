import mqtt, { IClientOptions, MqttClient } from "mqtt";
import matchTopic = require("mqtt-match");

import { BrokerLifecycleListener } from "./brokerLifecycleListener";

import uniqid from "uniqid";

export class ServiceBroker {
  private static readonly PING_ECHO_TIMEOUT = 3_000;
  private static readonly HEARTBEAT_INTERVAL = 10_000;

  private readonly mqttClient: MqttClient;
  private readonly resTopicPrefix: string;

  public readonly uuid: String;
  private readonly name: String;
  private readonly hearbeatMessage: string;

  private readonly lifecycleListener: BrokerLifecycleListener;
  private readonly messageListeners: Map<string, (message: Buffer) => void>;

  private ready: boolean;

  constructor(
    name: String,
    address: string,
    options: IClientOptions,
    lifecycleListener: BrokerLifecycleListener,
  ) {
    this.name = name;
    this.uuid = String(uniqid());
    this.hearbeatMessage = JSON.stringify({
      serviceId: this.uuid,
      containerName: this.name,
    });
    this.resTopicPrefix = `res/`;
    this.ready = false;

    this.lifecycleListener = lifecycleListener;
    this.messageListeners = new Map();

    const connectionSuccessHandler = async () => {
      console.log("Checking for other instances...");

      const instanceTestMessageCallback = (topic: String) => {
        clearTimeout(timeout);

        console.warn("Another instance was found. Aborting...");

        if (topic.startsWith(`${name}/echo`)) {
          abortConnection();
        }
      };

      this.mqttClient.subscribe(`${name}/echo/#`);
      this.mqttClient.on("message", instanceTestMessageCallback);

      this.mqttClient.publish(`${name}/ping/${this.uuid}`, "ping");

      const timeout = setTimeout(() => {
        // stop listening to echo's
        this.mqttClient.unsubscribe(`${name}/echo/#`);
        this.mqttClient.off("message", instanceTestMessageCallback);

        // start responding to ping's
        this.mqttClient.subscribe(`${name}/ping/#`);
        this.mqttClient.on("message", this.messageHandler);

        // Heartbeat
        setInterval(() => {
          this.mqttClient.publish(
            `heartbeat/${name}`,
            this.hearbeatMessage,
            (err) => {
              if (err)
                return console.error(
                  `Failed to publish message: ${err.message}`,
                );
            },
          );
        }, ServiceBroker.HEARTBEAT_INTERVAL);

        console.log("Connected to MQTT Broker.");
        this.ready = true;

        if (this.lifecycleListener) {
          this.lifecycleListener.onConnected();
        }
      }, ServiceBroker.PING_ECHO_TIMEOUT);
    };

    const abortConnection = () => {
      this.mqttClient.off("connect", connectionSuccessHandler);
      this.mqttClient.off("error", abortConnection);

      this.mqttClient.end(true);

      if (this.lifecycleListener) {
        this.lifecycleListener.onFailed();
      }
    };

    this.mqttClient = mqtt.connect(address, options);

    this.mqttClient.on("connect", connectionSuccessHandler);
    this.mqttClient.on("error", abortConnection);
  }

  private messageHandler = (topic: string, message: Buffer) => {
    if (topic.startsWith(`${this.name}/ping/`)) {
      return this.mqttClient.publish(`${this.name}/echo/${this.uuid}`, "pong");
    }

    this.messageListeners.forEach((callback, key) => {
      if (matchTopic(key, topic)) {
        callback(message);
      }
    });
  };

  public subscribe(
    topic: string,
    callback: (message: Buffer) => void,
    includeId: boolean = true,
  ) {
    if (this.ready) {
      topic = includeId ? `${this.uuid}/${topic}` : topic;
      this.mqttClient.subscribe(topic);
      this.messageListeners.set(topic, callback);

      console.log(`Subscribed to [${topic}]`);
    } else {
      console.warn("Client tried to subscribe before acknowledgement.");
    }
  }

  public unsubscribe(topic: string) {
    if (this.ready) {
      this.mqttClient.unsubscribe(topic);
      this.messageListeners.delete(topic);
    } else {
      console.warn("Client tried to unsubscribe before acknowledgement.");
    }
  }

  public publish(topic: string, message: string) {
    if (this.ready) {
      this.mqttClient.publish(topic, message);
      console.log(`Published [${topic}]: ${message}`);
    } else {
      console.warn("Client tried to publish before acknowledgement.");
    }
  }

  public publishResponse(reqId: string, data: object) {
    const message = JSON.stringify({
      reqId,
      timestamp: Date.now(),
      data,
    });
    this.publish(this.resTopicPrefix + reqId, message);
  }

  public publishError(reqId: string, message: string) {
    const res = JSON.stringify({
      reqId,
      timestamp: Date.now(),
      data: {
        message: message,
      },
    });
    this.publish(this.resTopicPrefix + reqId, res);
  }
}
