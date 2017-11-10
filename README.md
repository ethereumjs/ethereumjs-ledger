A wrapper library around the official Ledger JavaScript library that attempts to simplify usage and handle various failure modes/problems.

# Usage

```typescript
import { LedgerEthereum, BrowserLedgerConnectionFactory, Network } from "ethereumjs-ledger";

async function doStuff() {
	const onConnectLedgerRequest = async () => { await promptUserToConnectLedger(); }
	const onOpenEthereumAppRequest = async () => { await promptUserToOpenEthereumAppOnLedger(); }
	const onSwitchLedgerModeRequest = async () => { await promptUserToSwitchEthereumAppToBrowserModeAndRestartEthereumApp(); }
	const onEnableContractSupportRequest = async () => { await promptUserToEnableContractSupportInEthereumAppAndRestartEthereumApp(); }

	const ledgerEthereum = new LedgerEthereum(Network.Main, BrowserLedgerConnectionFactory, onConnectLedgerRequest, onOpenEthereumAppRequest, onSwitchLedgerModeRequest);
	const address = await ledgerEthereum.getAddressByBip44Index(0);
	const firstSignedMessagePromise = ledgerEthereum.signTransactionByBip44Index("e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080", 7);
	const secondSignedMessagePromise = ledgerEthereum.signTransactionByBip32Path("e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080", "m/44'/60'/0'/0/7");

	// this will block until both first and second messages are done because the library handles ordering internally
	const secondSignedMessage = await secondSignedMessage;

	// if the ledger isn't connected with the Ethereum app open in browser mode, the on*Request callbacks above will be called before the signing promises return
	const firstSignedMessage = await firstSignedMessage;

	// BIP44 index 7 is the same as `m/44'/60'/0'/0/7`; it is strongly recommended to use index 0 if you don't support multi-address wallets
	assert.equal(firstSignedMessage, secondSignedMessage);
}
```

# Development

### NOTE 0
The build does not work in Travis nor in Docker at the moment because `node-hid` (transitively required via `ledgerco`) attempts to initialize when `require('node-hid')` is called and this fails in the node Docker image and Travis CI because there is no access to USB devices in those environments.  This code's tests fully mock out everything that touches USB but because the `require('ledgerco')` fails none of the tests even attempt to run.  Further investigation may result in figuring out a way to run the tests in Docker/Travis, but for now expect them to fail.  This note should be re-evaluated when node-hid 6.0.0 is released and/or [this issue](https://github.com/node-hid/node-hid/issues/226#issuecomment-338734286) is closed.

### Note 1
`npm-shrinkwrap.json` force updates `node-hid`, a transitive dependency of `ledgerco` to `0.5.7`.  This is necessary to get things working on Windows without requiring python.

### Testing with a physical ledger
You can test in node by building the TypeScript files and then running `node output/scripts/node.js`.

You can test in browser by building the TypeScript files and then running `npx budo output/scripts/browser.js --ssl` (note: you need openssl binaries on your path or in the root of your project).
