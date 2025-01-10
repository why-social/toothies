interface DbErrorMessage {
	type: string;
	message: string;
}

class DatabaseError extends Error {
	constructor(message: DbErrorMessage) {
		super(JSON.stringify(message));
		Object.setPrototypeOf(this, DatabaseError.prototype);
	}
}
