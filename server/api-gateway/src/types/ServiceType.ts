export enum ServiceType {
  Appointments = "appointments",
  Accounts = "accounts",
}

export function typeFromString(s: string): ServiceType | undefined {
  return Object.values(ServiceType).includes(s as ServiceType)
    ? (s as ServiceType)
    : undefined;
}
