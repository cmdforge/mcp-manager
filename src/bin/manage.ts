#!/usr/bin/env node

import { createServer } from "../server/createServer.js";
import { protocol } from "../shared/protocol.js";

async function main() {
  const server = createServer(protocol);
  const started = await server.startWebSocket({
    host: "127.0.0.1",
    path: "/",
    port: 0,
  });

  installSignalHandlers(started.close);

  process.stdout.write(
    JSON.stringify({
      type: "websocket-url",
      url: started.url,
    }) + "\n",
  );

  await waitForPong(process.stdin);
  await started.peer;
  await started.closed;
}

function installSignalHandlers(close: () => Promise<void>) {
  const onSignal = async () => {
    try {
      await close();
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", () => {
    void onSignal();
  });

  process.once("SIGTERM", () => {
    void onSignal();
  });
}

async function waitForPong(stdin: NodeJS.ReadStream) {
  stdin.setEncoding("utf8");

  let buffer = "";
  for await (const chunk of stdin) {
    buffer += chunk;

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (isPong(line)) {
        return;
      }
    }
  }

  throw new Error("stdin ended before receiving pong handshake");
}

function isPong(line: string) {
  if (line === "pong") {
    return true;
  }

  if (!line) {
    return false;
  }

  try {
    const value = JSON.parse(line) as {
      type?: unknown;
    };

    return value.type === "pong";
  } catch {
    return false;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
