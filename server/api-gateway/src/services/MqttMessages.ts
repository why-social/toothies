export interface MqttRequest {
  timestamp: Number;
  reqId: string;
  data?: object;
}

export interface MqttResponse {
  timestamp: Number;
  status: Number;
  data: object;
}
