import mqtt from 'mqtt';

let counter:number = 1;

const options = {
	port: 1883,
	host: 'broker.hivemq.com',
	clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
}

const mqttClient = mqtt.connect(options);

const requestTopic = 'request/topic';
const responseTopic = 'response/topic';

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');

  mqttClient.subscribe(requestTopic, (err) => {
    if (err) {
      console.error('Failed to subscribe to request topic');
      return;
    }

    console.log(`Subscribed to ${requestTopic}`);
  });
});

mqttClient.on('message', (topic, message) => {
  if (topic === requestTopic) {
    console.log(`Received request: ${message.toString()}`);

    const responseMessage = `Reply #${counter} to: ${message.toString()}`;
    mqttClient.publish(responseTopic, responseMessage, (err) => {
		if (err) {
			console.error(`Failed to publish response message: ${err.message}`);
			return;
		}
		console.log(`Sent response: ${responseMessage}`);
		counter++;
	});
  }
});