declare module "ledgerco" {
	import * as Q from "q";

	interface comm {
		close_async(): Q.Promise<void>;
	}

	interface Signature {
		v: string;
		r: string;
		s: string;
	}

	export class comm_node implements comm {
		static list_async(): Q.Promise<string>;
		static create_async(timeoutMilliseconds?: number): Q.Promise<comm_node>;
		close_async(): Q.Promise<void>;
	}

	export class comm_u2f implements comm {
		static create_async(): Q.Promise<comm_u2f>;
		close_async(): Q.Promise<void>;
	}

	export class eth {
		constructor(comm: comm);
		getAddress_async(path: string, display?: boolean, chaincode?: boolean): Q.Promise<{ publicKey: string, address: string }>;
		signTransaction_async(path: string, rawTxHex: string): Q.Promise<Signature>;
		getAppConfiguration_async(): Q.Promise<{ arbitraryDataEnabled: number; version: string }>;
		signPersonalMessage_async(path: string, messageHex: string): Q.Promise<Signature>;
	}
}
