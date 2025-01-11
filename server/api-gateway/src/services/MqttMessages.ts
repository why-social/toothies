export interface MqttRequest {
  timestamp: number;
  reqId: string;
  data?: object;
}

export interface MqttResponse {
  timestamp: number;
  status: number;
  data: object;
}
