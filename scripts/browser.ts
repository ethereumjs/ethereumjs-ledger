import { LedgerEthereum, BrowserLedgerConnectionFactory, Network } from '../source/index';

async function doStuff() {
	const onConnectLedgerRequest = async () => { console.log('onConnectLedgerRequest'); }
	const onOpenEthereumAppRequest = async () => { console.log('onOpenEthereumAppRequest'); }
	const onSwitchLedgerModeRequest = async () => { console.log('onSwitchLedgerModeRequest'); }
	const onEnableContractSupportRequest = async () => { console.log('onEnableContractSupportRequest'); }

	const ledgerEthereum = new LedgerEthereum(Network.Main, BrowserLedgerConnectionFactory, onConnectLedgerRequest, onOpenEthereumAppRequest, onSwitchLedgerModeRequest, onEnableContractSupportRequest);
	const address = await ledgerEthereum.getAddressByBip44Index(0);
	console.log(address);
	const firstSignedMessagePromise = ledgerEthereum.signTransactionByBip44Index("e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080", 7);
	const secondSignedMessagePromise = ledgerEthereum.signTransactionByBip32Path("e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080", "m/44'/60'/0'/0/7");
	const firstSignedMessage = await firstSignedMessagePromise;
	const secondSignedMessage = await secondSignedMessagePromise;
	console.log(firstSignedMessage);
	console.log(secondSignedMessage);
}

doStuff().then(() => {
	console.log('done');
}).catch(error => {
	console.log(error);
});
