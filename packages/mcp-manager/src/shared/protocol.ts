import type {
  ServerJson,
  ServerResponse,
} from "./registry/index.js";
import {
  createProtocol,
} from "@cmdforge/jsonrpc";

export type ServerType = "official" | "mcpjson";

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
  nextCursor?: string;
  servers: ServerResponse[];
}

export type OfficialServersListResult =
  | OfficialServersNotReadyResult
  | OfficialServersReadyResult;

export interface OfficialServersListParams {
  category?: string;
  cursor?: string;
  search?: string;
}

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

export type ListServersParams =
  | ({
    type: "official";
  } & OfficialServersListParams)
  | {
    type: "mcpjson";
  };

export type ListServersResult =
  | ({
    type: "official";
  } & OfficialServersListResult)
  | ({
    type: "mcpjson";
  } & McpJsonServersListResult);

export type ConnectServersParams =
  | ({
    type: "official";
  } & OfficialServerConnectParams)
  | ({
    type: "mcpjson";
  } & McpJsonServerConnectParams);

export type ConnectServersResult =
  | ({
    type: "official";
  } & ConnectServerResult)
  | ({
    type: "mcpjson";
  } & ConnectServerResult);

export interface AddMcpJsonServerParams {
  server: ServerJson;
}

export interface RemoveMcpJsonServerParams {
  name: McpJsonServerName;
}

export const protocol = createProtocol(({ request, notification }) => ({
  clientToServer: {
    requests: {
      listServers: request("servers/list")<
        ListServersParams,
        ListServersResult
      >(),
      connectServer: request("servers/connect")<
        ConnectServersParams,
        ConnectServersResult
      >(),
      listOfficialServers: request("servers/official/list")<
        OfficialServersListParams | undefined,
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
