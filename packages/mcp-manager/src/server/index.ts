export * from './registry-client.js';
export * from './getAllServers.js';

import { invalidParamsError } from '@cmdforge/jsonrpc';
import { createServerFactory } from '@cmdforge/jsonrpc/server';
import type {
  ConnectServersParams,
  ListServersParams,
  OfficialServersListParams,
} from '../shared/protocol.js';
import { protocol } from '../shared/protocol.js';
import { getManagerInstance } from './manager.js';

const manager = getManagerInstance();

export const serverFactory = createServerFactory(protocol, (peer) => {
  manager.addSession(peer);

  peer.inbound.requests.servers.list(
    async (params: ListServersParams) => {
      switch (params.type) {
        case 'official':
          return {
            type: params.type,
            ...await manager.getOfficialServers(params),
          };
        case 'mcpjson':
          return {
            type: params.type,
            ...await manager.getMcpJsonServers(),
          };
        default:
          throw invalidParams(params);
      }
    },
  );

  peer.inbound.requests.servers.connect(
    async (params: ConnectServersParams) => {
      switch (params.type) {
        case 'official':
          return {
            type: params.type,
            ...await manager.connectOfficialServer(params),
          };
        case 'mcpjson':
          return {
            type: params.type,
            ...await manager.connectMcpJsonServer(params),
          };
        default:
          throw invalidParams(params);
      }
    },
  );

  peer.inbound.requests.servers.official.list(
    async (params: OfficialServersListParams = {}) => {
      return await manager.getOfficialServers(params);
    },
  );

  peer.inbound.requests.servers.official.connect(
    async (params) => {
      return await manager.connectOfficialServer(params);
    },
  );

  peer.inbound.requests.servers.mcpjson.list(
    async () => {
      return await manager.getMcpJsonServers();
    },
  );

  peer.inbound.requests.servers.mcpjson.connect(
    async (params) => {
      return await manager.connectMcpJsonServer(params);
    },
  );
});

function invalidParams(params: unknown) {
  return invalidParamsError(params);
}
