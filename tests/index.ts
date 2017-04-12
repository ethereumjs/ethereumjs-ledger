import * as Q from "q";
import { comm as LedgerConnection } from "ledgerco";
import { expect, use as chaiUse } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";

import { Signature, LockingLedgerConnection, LedgerEthereum, Network, ErrorWithCode, ErrorCode } from "../source/index"

chaiUse(chaiAsPromised);

describe("signature", async () => {
	it("to strings correctly", async () => {
		// TODO
	});
});

export function delay(milliseconds: number): Promise<void> { return new Promise<void>((resolve, reject) => setTimeout(resolve, milliseconds)); }

enum MockLedgerState {
	Unplugged,
	HomeScreen,
	NonEthereumApp,
	EthereumAppWrongMode,
	EthereumAppContractsDisabled,
	EthereumApp,
}

class MockLedgerConnection implements LedgerConnection {
	exchange = (apduHex: string, statusList: number[]): Q.Promise<string> => Q((async (apduHex: string, statusList: number[]): Promise<string> => {
		await delay(0);

		if (this.state === MockLedgerState.Unplugged) {
			throw "No device found";
		}

		if (this.state === MockLedgerState.HomeScreen) {
			// configuration request throws different error
			if (apduHex.startsWith("e006")) {
				throw "Invalid status 6d00";
			}
			throw "Invalid status 6700"; // wrong length
		}

		if (this.state === MockLedgerState.NonEthereumApp) {
			throw "Invalid status 6d00";
		}

		if (this.state === MockLedgerState.EthereumAppWrongMode) {
			throw "Invalid channel;";
		}

		// configuration request
		if (apduHex.startsWith("e006")) {
			return "010100039000";
		}

		// getAddress
		if (apduHex.startsWith("e002")) {
			return "41043defe479f9f1d10d108a942a7e88d4e9af2c0296789fac72fe2a29c39977d26147dc9d5b4ca96a54e11d29467ebd829aafb5ca645d9a2e55f9222b410536c79d28363033453336303139334235646430373942343435633639423941623765444234366134664162649000";
		}

		// signTransaction
		if (apduHex.startsWith("e004")) {
			return "1c7a808ab6985a90c9e9c07b3f7993e2dbcd0c3030ec48007f1f6a4787dc6eb50469c711ac971e76e58b11328db4ec072d6cc71f0c0dabd1669f4ac105e08b90c19000";
		}

		// signPersonalMessage
		if (apduHex.startsWith("e008")) {
			throw "Invalid status 6d00";
		}

		throw "Unknown request.";
	})(apduHex, statusList));
	setScrambleKey = () => { };
	close_async = (): Q.Promise<void> => Q((async (): Promise<void> => { await delay(0); })());

	public state = MockLedgerState.Unplugged;
}

describe("LockingLedgerConnection", async () => {
	let mockLedgerConnection: MockLedgerConnection;
	let lockingLedgerConnection: LockingLedgerConnection;
	beforeEach(() => {
		const ledgerConnectionFactory = async () => { await delay(0); return mockLedgerConnection; };
		mockLedgerConnection = new MockLedgerConnection();
		lockingLedgerConnection = new LockingLedgerConnection(ledgerConnectionFactory);
	});

	it("returns quickly when acquired", async () => {
		const timeout = setTimeout(() => { throw new Error("timeout called"); }, 5);
		await lockingLedgerConnection.acquire();
		clearTimeout(timeout);
	});

	it("blocks acquiring when already acquired", async () => {
		await lockingLedgerConnection.acquire();
		lockingLedgerConnection.acquire().then(() => { throw new Error("acquired a second connection"); });
		await delay(5);
	});

	it("allows for acquire after release", async () => {
		await lockingLedgerConnection.acquire();
		lockingLedgerConnection.release();
		await lockingLedgerConnection.acquire();
	});

	it("safely calls callbacks in order submitted", async () => {
		const results: string[] = [];
		lockingLedgerConnection.safelyCallEthereumApi(async x => { await delay(10); results.push("apple"); });
		lockingLedgerConnection.safelyCallEthereumApi(async x => { await delay(5); results.push("banana"); });
		await lockingLedgerConnection.safelyCallEthereumApi(async x => { results.push("cherry"); })

		expect(results).to.deep.equal(["apple", "banana", "cherry"]);
	});
});

describe("LedgerEthereum", async () => {
	let mockLedgerConnection: MockLedgerConnection;
	let ledgerEthereum: LedgerEthereum;
	let connectLedgerRequest: () => Promise<void>;
	let openEthereumAppRequest: () => Promise<void>;
	let switchLedgerModeRequest: () => Promise<void>;
	let enableContractSupportRequest: () => Promise<void>;
	let connectLedgerRequestCallbacks: boolean[];
	let openEthereumAppRequestCallbacks: boolean[];
	let switchLedgerModeRequestCallbacks: boolean[];
	let enableContractSupportRequestCallbacks: boolean[];
	beforeEach(() => {
		const ledgerConnectionFactory = async () => { await delay(0); return mockLedgerConnection; };
		mockLedgerConnection = new MockLedgerConnection();
		ledgerEthereum = new LedgerEthereum(Network.Main, ledgerConnectionFactory, () => connectLedgerRequest(), () => openEthereumAppRequest(), () => switchLedgerModeRequest(), () => enableContractSupportRequest());
		connectLedgerRequestCallbacks = [];
		openEthereumAppRequestCallbacks = [];
		switchLedgerModeRequestCallbacks = [];
		enableContractSupportRequestCallbacks = [];
		connectLedgerRequest = async () => { delay(0); connectLedgerRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumApp; }
		openEthereumAppRequest = async () => { delay(0); openEthereumAppRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumApp; }
		switchLedgerModeRequest = async () => { delay(0); switchLedgerModeRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumApp; }
		enableContractSupportRequest = async () => { delay(0); switchLedgerModeRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumApp; }
	});

	it("calls callback when device not plugged in", async () => {
		mockLedgerConnection.state = MockLedgerState.Unplugged;

		await ledgerEthereum.getAddressByBip44Index();
		expect(connectLedgerRequestCallbacks).to.deep.equal([true]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([]);
	});

	it("calls callback when on home screen", async () => {
		mockLedgerConnection.state = MockLedgerState.HomeScreen;

		await ledgerEthereum.getAddressByBip44Index();
		expect(connectLedgerRequestCallbacks).to.deep.equal([]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([true]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([]);
	});

	it("calls callback when non-ethreum app open", async () => {
		mockLedgerConnection.state = MockLedgerState.NonEthereumApp;

		await ledgerEthereum.getAddressByBip44Index();
		expect(connectLedgerRequestCallbacks).to.deep.equal([]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([true]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([]);
	});

	it("calls callback when in wrong mode", async () => {
		mockLedgerConnection.state = MockLedgerState.EthereumAppWrongMode;

		await ledgerEthereum.getAddressByBip44Index();
		expect(connectLedgerRequestCallbacks).to.deep.equal([]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([true]);
	});

	it("returns address", async () => {
		mockLedgerConnection.state = MockLedgerState.EthereumApp;

		const address = await ledgerEthereum.getAddressByBip44Index();

		expect(connectLedgerRequestCallbacks).to.deep.equal([]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([]);
		expect(address).to.equal("0x603E360193B5dd079B445c69B9Ab7eDB46a4fAbd");
	});

	it("returns address if connected during connected callback", async () => {
		mockLedgerConnection.state = MockLedgerState.Unplugged;

		const address = await ledgerEthereum.getAddressByBip44Index();

		expect(connectLedgerRequestCallbacks).to.deep.equal([true]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([]);
		expect(address).to.equal("0x603E360193B5dd079B445c69B9Ab7eDB46a4fAbd");
	});

	it("flows through all steps for novice user getting address", async () => {
		mockLedgerConnection.state = MockLedgerState.Unplugged;
		connectLedgerRequest = async () => { delay(0); connectLedgerRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.HomeScreen; }
		openEthereumAppRequest = async () => { delay(0); openEthereumAppRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumAppWrongMode; }
		switchLedgerModeRequest = async () => { delay(0); switchLedgerModeRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumAppContractsDisabled; }
		enableContractSupportRequest = async () => { delay(0); switchLedgerModeRequestCallbacks.push(true); mockLedgerConnection.state = MockLedgerState.EthereumApp; }

		const address = await ledgerEthereum.getAddressByBip44Index();

		expect(connectLedgerRequestCallbacks).to.deep.equal([true]);
		expect(openEthereumAppRequestCallbacks).to.deep.equal([true]);
		expect(switchLedgerModeRequestCallbacks).to.deep.equal([true]);
		expect(address).to.equal("0x603E360193B5dd079B445c69B9Ab7eDB46a4fAbd");
	});

	it("throws proper error when signature isn't in right format", async () => {
		mockLedgerConnection.state = MockLedgerState.EthereumApp;

		try {
			const signature = await ledgerEthereum.signTransactionByBip44Index("letters");
			expect(false).to.be.true;
		} catch (error) {
			expect(error).to.be.instanceof(ErrorWithCode);
			expect(error.code).to.equal(ErrorCode.InvalidInput);
		}
	});

	it("throws when connect ledger request throws", async () => {
		mockLedgerConnection.state = MockLedgerState.Unplugged;

		connectLedgerRequest = async () => { await delay(0); throw new Error("apple"); }

		try {
			const address = await ledgerEthereum.getAddressByBip44Index();
			expect(false).to.be.true;
		} catch (error) {
			expect(error).to.be.instanceof(Error);
			expect(error.message).to.equal("apple");
		}
	});

	it("returns signed message", async () => {
		mockLedgerConnection.state = MockLedgerState.EthereumApp;

		const signature = await ledgerEthereum.signTransactionByBip44Index("e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080");

		expect(signature.r).to.equal("7a808ab6985a90c9e9c07b3f7993e2dbcd0c3030ec48007f1f6a4787dc6eb504");
		expect(signature.s).to.equal("69c711ac971e76e58b11328db4ec072d6cc71f0c0dabd1669f4ac105e08b90c1");
		expect(signature.v).to.equal("1c");
		expect(signature.toString()).to.equal("0x7a808ab6985a90c9e9c07b3f7993e2dbcd0c3030ec48007f1f6a4787dc6eb50469c711ac971e76e58b11328db4ec072d6cc71f0c0dabd1669f4ac105e08b90c11c");
	});

	it("fails", async () => {
		expect(false).to.be.true;
	});
});
