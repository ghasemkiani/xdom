import test from "node:test";
import assert from "node:assert";

import {
  X,
  Script,
  Style,
  Rule,
  RuleSet,
  Stylesheet,
  iwx,
  beautify,
} from "@ghasemkiani/xdom";

test("X is available", async (t) => {
  assert.ok(X);
});
