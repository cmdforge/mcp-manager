import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getAllServers } from "./getAllServers.js";

test("loads cached registry servers", async (t) => {
  const cacheFile = path.join(os.homedir(), ".cmdforge/mcp-manager/registry.json");
  if (!fs.existsSync(cacheFile)) {
    t.skip("registry cache is not present");
    return;
  }

  const servers = await getAllServers();

  assert.ok(Array.isArray(servers));
  assert.ok(servers.length > 0);
  assert.equal(typeof servers[0]?.server?.name, "string");
  assert.equal(typeof servers[0]?.server?.version, "string");
});
