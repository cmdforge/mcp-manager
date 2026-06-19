import assert from "node:assert/strict";
import test from "node:test";
import type { JsonRpcConnectionLike } from "./jsonrpc.js";
import {
  protocol,
  type OfficialServerConnectParams,
  type OfficialServersReadyParams,
} from "./protocol.js";

class FakeConnection implements JsonRpcConnectionLike {
  readonly requests = new Map<string, (...params: unknown[]) => unknown>();
  readonly notifications = new Map<string, (...params: unknown[]) => void>();
  readonly sentRequests: Array<{ method: string; params: unknown[] }> = [];
  readonly sentNotifications: Array<{ method: string; params: unknown[] }> = [];

  async sendRequest<R>(type: { method: string }, ...params: unknown[]): Promise<R> {
    this.sentRequests.push({
      method: type.method,
      params,
    });

    return undefined as R;
  }

  sendNotification(type: { method: string }, ...params: unknown[]): void {
    this.sentNotifications.push({
      method: type.method,
      params,
    });
  }

  onRequest(type: { method: string }, handler: (...params: unknown[]) => unknown): void {
    this.requests.set(type.method, handler);
  }

  onNotification(type: { method: string }, handler: (...params: unknown[]) => void): void {
    this.notifications.set(type.method, handler);
  }
}

test("protocol client exposes nested outbound APIs and registers inbound notifications", async () => {
  const connection = new FakeConnection();
  const seenReady: Array<{ count: number; loadedAt: string }> = [];

  const client = protocol.client(connection, {
    notifications: {
      servers: {
        official: {
          ready(params: OfficialServersReadyParams) {
            seenReady.push(params);
          },
        },
      },
    },
  });

  await client.requests.servers.official.list();
  await client.requests.servers.mcpjson.connect({
    name: "example",
  });

  assert.deepEqual(connection.sentRequests, [
    {
      method: "servers/official/list",
      params: [],
    },
    {
      method: "servers/mcpjson/connect",
      params: [
        {
          name: "example",
        },
      ],
    },
  ]);

  const readyHandler = connection.notifications.get("servers/official/ready");
  assert.ok(readyHandler);

  readyHandler({
    count: 123,
    loadedAt: "2026-06-18T00:00:00.000Z",
  });

  assert.deepEqual(seenReady, [
    {
      count: 123,
      loadedAt: "2026-06-18T00:00:00.000Z",
    },
  ]);
});

test("protocol server exposes nested outbound APIs and registers inbound requests", async () => {
  const connection = new FakeConnection();

  const server = protocol.server(connection, {
    requests: {
      servers: {
        official: {
          async connect(params: OfficialServerConnectParams) {
            return {
              url: `ws://official/${params.name}/${params.target.type}/${params.target.index}`,
            };
          },
        },
        mcpjson: {
          list() {
            return {
              servers: [],
            };
          },
        },
      },
    },
  });

  server.notifications.servers.official.ready({
    count: 2,
    loadedAt: "2026-06-18T00:00:00.000Z",
  });

  assert.deepEqual(connection.sentNotifications, [
    {
      method: "servers/official/ready",
      params: [
        {
          count: 2,
          loadedAt: "2026-06-18T00:00:00.000Z",
        },
      ],
    },
  ]);

  const officialConnect = connection.requests.get("servers/official/connect");
  assert.ok(officialConnect);

  const officialConnectResult = await officialConnect({
    name: "io.github.user/weather",
    target: {
      type: "remote",
      index: 1,
    },
  });

  assert.deepEqual(officialConnectResult, {
    url: "ws://official/io.github.user/weather/remote/1",
  });

  const mcpjsonList = connection.requests.get("servers/mcpjson/list");
  assert.ok(mcpjsonList);

  const mcpjsonListResult = await mcpjsonList();
  assert.deepEqual(mcpjsonListResult, {
    servers: [],
  });
});
