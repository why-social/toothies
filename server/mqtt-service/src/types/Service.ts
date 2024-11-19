export class Service{
	private serviceId:string;
	private containerName:string;
	private lastHeartbeat:number;

	constructor(serviceId:string, containerName:string){
		this.serviceId = serviceId;
		this.containerName = containerName;
		this.lastHeartbeat = Date.now();
	}

	public getServiceId():string {
		return this.serviceId;
	}

	public getContainerName():string {
		return this.containerName;
	}

	public getLastHeartbeat():number {
		return this.lastHeartbeat;
	}

	public updateHeartbeat():void {
		this.lastHeartbeat = Date.now();
	}

	public static fromJSON(json:string|Buffer):Service{
		const obj = JSON.parse(json.toString());

		if(obj.serviceId === undefined || obj.containerName === undefined){
			throw new Error('Invalid JSON');
		}

		return new Service(obj.serviceId, obj.containerName);
	}

	public toString():string {
		return JSON.stringify({
			serviceId: this.serviceId,
			containerName: this.containerName
		});
	}
}