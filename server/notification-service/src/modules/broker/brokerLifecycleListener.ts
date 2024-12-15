export interface BrokerLifecycleListener {
    onConnected(): void;
    onFailed(): void;
}