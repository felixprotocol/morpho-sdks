import _ from "lodash";
import { parseEther, parseUnits } from "viem";

import { NATIVE_ADDRESS } from "@morpho-org/blue-sdk";

import { describe, expect, test } from "vitest";
import { simulateOperation } from "../../../src/index.js";
import {
  dataFixture,
  marketA1,
  marketA2,
  tokenA,
  userB,
  vaultA,
} from "../../fixtures.js";

const type = "MetaMorpho_PublicReallocate";

describe(type, () => {
  test("should reallocate from market A1 to A2", () => {
    const assets = parseUnits("40", 6);
    const shares = parseUnits("40", 6 + 6);

    const result = simulateOperation(
      {
        type,
        sender: userB,
        address: vaultA.address,
        args: {
          withdrawals: [
            {
              id: marketA1.id,
              assets,
            },
          ],
          supplyMarketId: marketA2.id,
        },
      },
      dataFixture,
    );

    const expected = _.cloneDeep(dataFixture);
    expected.positions[vaultA.address]![marketA1.id]!.supplyShares = parseUnits(
      "960",
      6 + 6,
    );
    expected.positions[vaultA.address]![marketA2.id]!.supplyShares = parseUnits(
      "440",
      6 + 6,
    );

    expected.markets[marketA1.id]!.totalSupplyAssets -= assets;
    expected.markets[marketA1.id]!.totalSupplyShares -= shares;

    expected.markets[marketA2.id]!.totalSupplyAssets += assets;
    expected.markets[marketA2.id]!.totalSupplyShares += shares;

    expected.holdings[userB]![NATIVE_ADDRESS]!.balance -= parseEther("0.005");
    expected.vaults[vaultA.address]!.publicAllocatorConfig!.accruedFee +=
      parseEther("0.005");

    expected.holdings[vaultA.address]![tokenA]!.erc20Allowances.morpho -=
      assets;

    expected.vaultMarketConfigs[vaultA.address]![marketA1.id]!
      .publicAllocatorConfig!.maxIn += assets;
    expected.vaultMarketConfigs[vaultA.address]![marketA1.id]!
      .publicAllocatorConfig!.maxOut -= assets;

    expected.vaultMarketConfigs[vaultA.address]![marketA2.id]!
      .publicAllocatorConfig!.maxIn -= assets;
    expected.vaultMarketConfigs[vaultA.address]![marketA2.id]!
      .publicAllocatorConfig!.maxOut += assets;

    expect(result).toEqual(expected);
  });

  test("should not reallocate from market A2 to A1 if max outflow exceeded", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userB,
          address: vaultA.address,
          args: {
            withdrawals: [
              {
                id: marketA2.id,
                assets: parseUnits("10", 6),
              },
            ],
            supplyMarketId: marketA1.id,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `
      [Error: max outflow exceeded for vault "0x000000000000000000000000000000000000000A" on market "0x82b7572458381128c105a67bc944e36b6318aa3c8095074efe9da6274b8e236a"

      when simulating operation:
      {
        "type": "MetaMorpho_PublicReallocate",
        "sender": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        "address": "0x000000000000000000000000000000000000000A",
        "args": {
          "withdrawals": [
            {
              "id": "0x82b7572458381128c105a67bc944e36b6318aa3c8095074efe9da6274b8e236a",
              "assets": "10000000n"
            }
          ],
          "supplyMarketId": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd"
        }
      }]
    `,
    );
  });

  test("should not reallocate from market A1 to A2 if max inflow exceeded", () => {
    expect(() =>
      simulateOperation(
        {
          type,
          sender: userB,
          address: vaultA.address,
          args: {
            withdrawals: [
              {
                id: marketA1.id,
                assets: parseUnits("50", 6),
              },
            ],
            supplyMarketId: marketA2.id,
          },
        },
        dataFixture,
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `
      [Error: max inflow exceeded for vault "0x000000000000000000000000000000000000000A" on market "0x82b7572458381128c105a67bc944e36b6318aa3c8095074efe9da6274b8e236a"

      when simulating operation:
      {
        "type": "MetaMorpho_PublicReallocate",
        "sender": "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        "address": "0x000000000000000000000000000000000000000A",
        "args": {
          "withdrawals": [
            {
              "id": "0x042487b563685b432d4d2341934985eca3993647799cb5468fb366fad26b4fdd",
              "assets": "50000000n"
            }
          ],
          "supplyMarketId": "0x82b7572458381128c105a67bc944e36b6318aa3c8095074efe9da6274b8e236a"
        }
      }]
    `,
    );
  });
});
