# Mqtt Service Broker

This is a simple client wrapper to be used from a service to communicate with a mqtt broker.

## How to get it working

### 1. The usual suspects

_from `modules/mqtt-service-broker`_

  ```bash
  npm install
  npm run build
  ```

### 2. The trick

_from `modules/mqtt-service-broker`_

  ```bash
  npm link
  ```

### 3. Usage

_from the service directory_

  ```bash
  npm link @toothies-org/mqtt-service-broker
  ```

  ```typescript
  import { ServiceBroker } from "@toothies-org/mqtt-service-broker";
  // -------------------- DEFINE BROKER --------------------
  const broker: ServiceBroker = new ServiceBroker(
    "service name",
    "broker url here"
    {
      username: "username",
      password: "assword",
    },
    {
      onFailed() {
        process.exit(0);
      },
      onConnected() {
        broker.subscribe("topic", cb);
      },
    },
  );
  ```
