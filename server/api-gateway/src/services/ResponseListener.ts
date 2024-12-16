import { MqttResponse } from "./MqttMessages";

export interface ResponseListener {
  onResponse(res: MqttResponse): void;
  onServiceError(err: string): void;
}
