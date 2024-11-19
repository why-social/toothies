export class HeartbeatMessage {
	private serviceId:string; 
	private containerName:string;

	constructor(serviceId_or_msg:string|Buffer, containerName:string="") {
		if(serviceId_or_msg instanceof Buffer){
			const obj = JSON.parse(serviceId_or_msg.toString());
			this.serviceId = obj.serviceId;
			this.containerName = obj.containerName;
		} else {
			this.serviceId = serviceId_or_msg;
			this.containerName = containerName;
		}
	}

	public getServiceId():string {
		return this.serviceId;
	}

	public getContainerName():string {
		return this.containerName;
	}

	public toString():string {
		return JSON.stringify({
			serviceId: this.serviceId,
			containerName: this.containerName
		});
	}
}