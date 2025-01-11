export interface DbStateListener {
	onSwitchDb(newString: string): void;
}
