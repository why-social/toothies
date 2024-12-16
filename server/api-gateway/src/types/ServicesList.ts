import { Service } from "./Service";
import mqtt from "mqtt";

export class ServicesList {
  private services: Map<string, Service>;
  private roundRobinCounter: number;
  private heartbeatInterval: number;
  private checkInterval: number;

  constructor(heartbeatInterval: number = 13000, checkInterval: number = 5000) {
    this.services = new Map();
    this.roundRobinCounter = 0;
    this.heartbeatInterval = heartbeatInterval;
    this.checkInterval = checkInterval;

    // Remove dead services
    setInterval(() => this.checkDeadServices(), this.checkInterval);
  }

  public addService(service: Service): void {
    this.services.set(service.getServiceId(), service);
  }

  public removeService(serviceId: string): void {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      console.log(`Removed service due to inactivity: ${serviceId}`);
    }
  }

  public getService(serviceId: string): Service | null {
    return this.services.get(serviceId) || null;
  }

  public updateHeartbeat(serviceId: string): void {
    const service = this.getService(serviceId);
    if (service) {
      service.updateHeartbeat();
    }
  }

  public getServices(): Map<string, Service> {
    return this.services;
  }

  public hasService(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  public getServicesCount(): number {
    return this.services.size;
  }

  public getRoundRobinService(): Service | null {
    const servicesArray = Array.from(this.services.values());
    if (servicesArray.length === 0) {
      return null;
    }

    // Check if the counter is out of bounds
    if (this.roundRobinCounter >= servicesArray.length) {
      this.roundRobinCounter = 0;
    }

    const service = servicesArray[this.roundRobinCounter];
    this.roundRobinCounter =
      (this.roundRobinCounter + 1) % servicesArray.length;

    return service;
  }

  private checkDeadServices(): void {
    const now = Date.now();
    this.services.forEach((service, serviceId) => {
      if (now - service.getLastHeartbeat() > this.heartbeatInterval) {
        this.removeService(serviceId);
      }
    });
  }
}
