import { BrokerConnection } from "./modules/broker/brokerConnection";

const broker: BrokerConnection = new BrokerConnection("accounts", {
  onFailed() {
    process.exit(0);
  },
  onConnected() {
    broker.subscribe("#", (message) => {
      console.log(message.toString());
    });
  },
});
