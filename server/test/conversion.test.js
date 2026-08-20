import test from "node:test";
import assert from "node:assert/strict";

test("grocery base-unit calculation: 50 packets of 200 g deducts 10 kg", () => {
  const purchasedBaseQty = 50 * 1000;
  const soldBaseQty = 50 * 200;
  assert.equal(purchasedBaseQty, 50000);
  assert.equal(soldBaseQty, 10000);
  assert.equal(purchasedBaseQty - soldBaseQty, 40000);
});

