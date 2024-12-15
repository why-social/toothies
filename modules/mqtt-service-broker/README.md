# Mqtt Service Broker

This is a simple client wrapper to be used from a service to communicate with a mqtt broker.

## How to get it working

### The usual suspects

  ```bash
  npm install
  npm run build
  ```

### The trick

  ```bash
  npm link
  ```

### Usage

__In the service__

  ```bash
  npm link @toothies-org/mqtt-service-broker
  ```

  ```typescript
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
