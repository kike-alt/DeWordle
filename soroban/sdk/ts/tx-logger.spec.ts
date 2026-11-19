import { Account, nativeToScVal } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildContractTx, describeTx, noopTxLogger, simulateAndAssemble, type TxLogger } from "./tx-builder";
import { CONTRACT_IDS, SOURCE_KEY, TESTNET, resetRpcMocks, rpc } from "./testing/rpc-mock";

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) =>
  (await import("./testing/rpc-mock")).withMockedRpc(await importOriginal<Record<string, unknown>>()),
);

beforeEach(() => resetRpcMocks());

const build = (logger?: TxLogger) =>
  buildContractTx({
    server: new Server(TESTNET.rpcUrl),
    source: new Account(SOURCE_KEY, "100"),
    network: TESTNET,
    contractId: CONTRACT_IDS.core_game,
    method: "create_session",
    args: [nativeToScVal(7, { type: "u32" }), nativeToScVal(3, { type: "u32" })],
    logger,
  });

describe("transaction logger", () => {
  it("fires onBuildStart then onSimulated in order with operation, params and XDR size", async () => {
    const calls: string[] = [];
    const logger: TxLogger = {
      onBuildStart: (i) => calls.push(`build:${i.operation}:${JSON.stringify(i.params)}`),
      onSimulated: (i) => calls.push(`simulated:${i.operation}:${i.xdrSize > 0}`),
    };
    const tx = await build(logger);
    rpc.simulateTransaction.mockResolvedValueOnce({ id: "1", latestLedger: 1, events: [], transactionData: {}, minResourceFee: "1" });
    await simulateAndAssemble({ server: new Server(TESTNET.rpcUrl), tx, logger });
    expect(calls).toEqual(["build:create_session:[7,3]", "simulated:create_session:true"]);
  });

  it("is a no-op by default and never touches the console", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const tx = await build();
    rpc.simulateTransaction.mockResolvedValueOnce({ id: "1", latestLedger: 1, events: [], transactionData: {}, minResourceFee: "1" });
    await simulateAndAssemble({ server: new Server(TESTNET.rpcUrl), tx });
    expect(spy).not.toHaveBeenCalled();
    expect(noopTxLogger).toEqual({});
    spy.mockRestore();
  });

  it("describeTx reports method, decoded args and envelope size", async () => {
    const info = describeTx(await build());
    expect(info.operation).toBe("create_session");
    expect(info.params).toEqual([7, 3]);
    expect(info.xdrSize).toBeGreaterThan(0);
  });
});
