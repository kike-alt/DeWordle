#!/usr/bin/env ts-node
/**
 * DX-108: Local mock mode for Stellar RPC and contracts.
 * Starts a lightweight HTTP server that simulates Soroban RPC responses
 * so developers can work without connecting to testnet.
 *
 * Usage: npx ts-node scripts/mock-stellar.ts [--port 8000]
 * Set env: SOROBAN_RPC_URL=http://localhost:8000
 */
import http from 'http';

const port = parseInt(process.argv.find((a) => a.startsWith('--port'))?.split('=')[1] ?? '8000', 10);

interface MockResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

const handlers: Record<string, (params: unknown) => unknown> = {
  getHealth: () => ({ status: 'healthy' }),

  getLatestLedger: () => ({
    id: 'mock-ledger-hash',
    sequence: 1_000_000,
    protocolVersion: 21,
  }),

  simulateTransaction: () => ({
    latestLedger: 1_000_000,
    cost: { cpuInsns: '1000000', memBytes: '1000000' },
    results: [
      {
        auth: [],
        xdr: 'AAAABAAAAAAAAAAAAAAAAgAA',
      },
    ],
  }),

  sendTransaction: () => ({
    status: 'PENDING',
    hash: `mock-tx-${Date.now()}`,
    latestLedger: 1_000_000,
    latestLedgerCloseTime: Math.floor(Date.now() / 1000).toString(),
  }),

  getTransaction: (params: any) => ({
    status: 'SUCCESS',
    latestLedger: 1_000_001,
    latestLedgerCloseTime: Math.floor(Date.now() / 1000).toString(),
    ledger: 1_000_001,
    createdAt: Math.floor(Date.now() / 1000).toString(),
    applicationOrder: 1,
    envelopeXdr: 'mock-envelope-xdr',
    resultXdr: 'AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAo=',
    resultMetaXdr: 'mock-result-meta-xdr',
  }),

  getContractData: () => ({
    ledgerEntryData: 'mock-contract-data-xdr',
    lastModifiedLedger: 999_000,
    latestLedger: 1_000_000,
  }),
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const rpc = JSON.parse(body);
      const handler = handlers[rpc.method];

      const response: MockResponse = {
        jsonrpc: '2.0',
        id: rpc.id,
      };

      if (handler) {
        response.result = handler(rpc.params);
      } else {
        response.error = { code: -32601, message: `Method not found: ${rpc.method}` };
        console.warn(`[mock-stellar] Unknown method: ${rpc.method}`);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
    }
  });
});

server.listen(port, () => {
  console.log(`[mock-stellar] Soroban RPC mock listening on http://localhost:${port}`);
  console.log('[mock-stellar] Set SOROBAN_RPC_URL=http://localhost:' + port + ' in your .env.local');
  console.log('[mock-stellar] Supported methods:', Object.keys(handlers).join(', '));
});