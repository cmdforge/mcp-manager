import type {
  ServerJson,
  ServerResponse,
} from "./registry/index.js";
import {
  createProtocol,
} from "./jsonrpc.js";

export type ServerType = "official" | "mcp.json";

export type OfficialServerName = ServerResponse["server"]["name"];
export type McpJsonServerName = ServerJson["name"];

export interface OfficialServersReadyParams {
  count: number;
  loadedAt: string;
}

export interface OfficialServersNotReadyResult {
  ready: false;
}

export interface OfficialServersReadyResult {
  ready: true;
  count: number;
  loadedAt: string;
  servers: ServerResponse[];
}

export type OfficialServersListResult =
  | OfficialServersNotReadyResult
  | OfficialServersReadyResult;

export interface McpJsonServersListResult {
  servers: ServerJson[];
}

export interface McpJsonServersChangedParams {
  servers: ServerJson[];
}

export type OfficialServerConnectTarget =
  | {
      type: "remote";
      index: number;
    }
  | {
      type: "package";
      index: number;
    };

export interface OfficialServerConnectParams {
  name: OfficialServerName;
  target: OfficialServerConnectTarget;
}

export interface McpJsonServerConnectParams {
  name: McpJsonServerName;
}

export interface ConnectServerResult {
  url: string;
}

export interface AddMcpJsonServerParams {
  server: ServerJson;
}

export interface RemoveMcpJsonServerParams {
  name: McpJsonServerName;
}

export const protocol = createProtocol(({ request, notification }) => ({
  clientToServer: {
    requests: {
      listOfficialServers: request("servers/official/list")<
        void,
        OfficialServersListResult
      >(),
      connectOfficialServer: request("servers/official/connect")<
        OfficialServerConnectParams,
        ConnectServerResult
      >(),
      listMcpJsonServers: request("servers/mcpjson/list")<
        void,
        McpJsonServersListResult
      >(),
      addMcpJsonServer: request("servers/mcpjson/add")<
        AddMcpJsonServerParams,
        McpJsonServersListResult
      >(),
      removeMcpJsonServer: request("servers/mcpjson/remove")<
        RemoveMcpJsonServerParams,
        McpJsonServersListResult
      >(),
      connectMcpJsonServer: request("servers/mcpjson/connect")<
        McpJsonServerConnectParams,
        ConnectServerResult
      >(),
    },
  },
  serverToClient: {
    notifications: {
      officialServersReady: notification("servers/official/ready")<
        OfficialServersReadyParams
      >(),
      mcpJsonServersChanged: notification("servers/mcpjson/listChanged")<
        McpJsonServersChangedParams
      >(),
    },
  },
  bidirectional: {},
}));

export type ManagerProtocol = typeof protocol;
