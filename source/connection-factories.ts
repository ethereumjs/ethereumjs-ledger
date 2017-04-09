import { comm as LedgerConnection, comm_u2f as LedgerBrowserConnection, comm_node as LedgerNodeConnection } from "ledgerco";

export type LedgerConnectionFactory = () => Promise<LedgerConnection>;
export async function BrowserLedgerConnectionFactory() { return await LedgerBrowserConnection.create_async(); }
export async function NodeLedgerConnectionFactory() { return await LedgerNodeConnection.create_async(); }
