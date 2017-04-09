import { comm as LedgerConnection, eth as LedgerEthereumApi } from "ledgerco";
import { Lock } from "semaphore-async-await";

import { LedgerConnectionFactory } from "./connection-factories";

export class LockingLedgerConnection {
	private readonly lock = new Lock();
	private connection: LedgerConnection | null = null;
	private ledgerConnectionFactory: LedgerConnectionFactory;

	constructor(connectionFactory: LedgerConnectionFactory) {
		this.ledgerConnectionFactory = connectionFactory;
	}

	public acquire = async (): Promise<LedgerConnection> => {
		await this.lock.acquire();
		if (this.connection !== null) throw new Error("Somehow acquired the lock with a connection object available.  Should not be possible.");
		try {
			return this.connection = await this.ledgerConnectionFactory();
		} catch (error) {
			this.release();
			throw error;
		}
	}

	public release = async (): Promise<void> => {
		try {
			// should always evaluate to true
			if (this.connection !== null) await this.connection.close_async();
			this.connection = null;
		} finally {
			this.lock.release();
		}
	}

	public safelyCallEthereumApi = async <T>(func: (ledgerEthereumApi: LedgerEthereumApi) => Promise<T>): Promise<T> => {
		const ledgerConnection = await this.acquire();
		try {
			const ledgerEthereumApi = new LedgerEthereumApi(ledgerConnection);
			return await func(ledgerEthereumApi);
		} finally {
			this.release();
		}
	}
}
