import {
  NotificationType,
  RequestType,
} from "vscode-jsonrpc";

export type ProtocolRequest<
  Method extends string,
  Params,
  Result,
  Error = void,
> = RequestType<Params, Result, Error> & {
  readonly method: Method;
  readonly __kind?: "request";
  readonly __params?: Params;
  readonly __result?: Result;
  readonly __error?: Error;
};

export type ProtocolNotification<
  Method extends string,
  Params,
> = NotificationType<Params> & {
  readonly method: Method;
  readonly __kind?: "notification";
  readonly __params?: Params;
};

export type ProtocolDefinition = {
  clientToServer: ProtocolDirection;
  serverToClient: ProtocolDirection;
  bidirectional: ProtocolDirection;
};

export interface ProtocolDirection {
  requests?: Record<string, ProtocolRequest<string, unknown, unknown, unknown>>;
  notifications?: Record<string, ProtocolNotification<string, unknown>>;
}

type AnyRequest = ProtocolRequest<string, unknown, unknown, unknown>;
type AnyNotification = ProtocolNotification<string, unknown>;
type AnyProtocolMember = AnyRequest | AnyNotification;

type RequestsOf<Direction extends ProtocolDirection> =
  Direction["requests"] extends Record<string, AnyRequest>
    ? Direction["requests"]
    : {};
type NotificationsOf<Direction extends ProtocolDirection> =
  Direction["notifications"] extends Record<string, AnyNotification>
    ? Direction["notifications"]
    : {};

type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends ((arg: infer I) => void)
    ? I
    : never;

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type RecursivePartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? {
        [K in keyof T]?: RecursivePartial<T[K]>;
      }
    : T;

type MethodToPath<Method extends string> =
  Method extends `${infer Head}/${infer Tail}`
    ? [Head, ...MethodToPath<Tail>]
    : [Method];

type RequestParams<T> = T extends { readonly __params?: infer Params }
  ? Params
  : never;

type RequestResult<T> = T extends { readonly __result?: infer Result }
  ? Result
  : never;

type NotificationParams<T> = T extends { readonly __params?: infer Params }
  ? Params
  : never;

type Sender<T> = T extends { readonly __kind?: "request" }
  ? (...args: [RequestParams<T>] extends [void] ? [] : [RequestParams<T>]) => Promise<RequestResult<T>>
  : T extends { readonly __kind?: "notification" }
    ? (...args: [NotificationParams<T>] extends [void] ? [] : [NotificationParams<T>]) => void
    : never;

type RequestHandler<T> = T extends { readonly __kind?: "request" }
  ? (...args: [RequestParams<T>] extends [void] ? [] : [RequestParams<T>]) => RequestResult<T> | Promise<RequestResult<T>>
  : never;

type NotificationHandler<T> = T extends { readonly __kind?: "notification" }
  ? (...args: [NotificationParams<T>] extends [void] ? [] : [NotificationParams<T>]) => void | Promise<void>
  : never;

type PathTree<Path extends string[], Leaf> =
  Path extends [infer Head extends string, ...infer Tail extends string[]]
    ? {
        [K in Head]: Tail extends [] ? Leaf : PathTree<Tail, Leaf>;
      }
    : never;

type RequestMembersToTree<
  Members extends Record<string, AnyRequest>,
  Leaf,
> = Simplify<
  UnionToIntersection<
    {
      [K in keyof Members]:
        Members[K] extends AnyRequest
          ? PathTree<
              MethodToPath<Members[K]["method"]>,
              Members[K] extends AnyRequest
                ? Leaf extends "sender"
                  ? Sender<Members[K]>
                  : RequestHandler<Members[K]>
                : never
            >
          : never;
    }[keyof Members]
  >
>;

type NotificationMembersToTree<
  Members extends Record<string, AnyNotification>,
  Leaf,
> = Simplify<
  UnionToIntersection<
    {
      [K in keyof Members]:
        Members[K] extends AnyNotification
          ? PathTree<
              MethodToPath<Members[K]["method"]>,
              Members[K] extends AnyNotification
                ? Leaf extends "sender"
                  ? Sender<Members[K]>
                  : NotificationHandler<Members[K]>
                : never
            >
          : never;
    }[keyof Members]
  >
>;

export type RequestSenderTree<Members extends Record<string, AnyRequest>> = RequestMembersToTree<
  Members,
  "sender"
>;

export type NotificationSenderTree<
  Members extends Record<string, AnyNotification>,
> = NotificationMembersToTree<
  Members,
  "sender"
>;

export type RequestHandlerTree<Members extends Record<string, AnyRequest>> = RequestMembersToTree<
  Members,
  "handler"
>;

export type NotificationHandlerTree<Members extends Record<string, AnyNotification>> = NotificationMembersToTree<
  Members,
  "handler"
>;

type OutboundRequests<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> = Role extends "client"
  ? RequestsOf<Definition["clientToServer"]> & RequestsOf<Definition["bidirectional"]>
  : RequestsOf<Definition["serverToClient"]> & RequestsOf<Definition["bidirectional"]>;

type OutboundNotifications<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> = Role extends "client"
  ? NotificationsOf<Definition["clientToServer"]> & NotificationsOf<Definition["bidirectional"]>
  : NotificationsOf<Definition["serverToClient"]> & NotificationsOf<Definition["bidirectional"]>;

type InboundRequests<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> = Role extends "client"
  ? RequestsOf<Definition["serverToClient"]> & RequestsOf<Definition["bidirectional"]>
  : RequestsOf<Definition["clientToServer"]> & RequestsOf<Definition["bidirectional"]>;

type InboundNotifications<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> = Role extends "client"
  ? NotificationsOf<Definition["serverToClient"]> & NotificationsOf<Definition["bidirectional"]>
  : NotificationsOf<Definition["clientToServer"]> & NotificationsOf<Definition["bidirectional"]>;

export interface JsonRpcConnectionLike {
  sendRequest<R>(type: { method: string }, ...params: unknown[]): Promise<R>;
  sendNotification(type: { method: string }, ...params: unknown[]): void;
  onRequest(type: { method: string }, handler: (...params: unknown[]) => unknown): void;
  onNotification(type: { method: string }, handler: (...params: unknown[]) => void): void;
}

export interface ProtocolHandlers<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> {
  requests?: RecursivePartial<RequestHandlerTree<InboundRequests<Definition, Role>>>;
  notifications?: RecursivePartial<NotificationHandlerTree<InboundNotifications<Definition, Role>>>;
}

export interface ProtocolPeer<
  Definition extends ProtocolDefinition,
  Role extends "client" | "server",
> {
  requests: RequestSenderTree<OutboundRequests<Definition, Role>>;
  notifications: NotificationSenderTree<OutboundNotifications<Definition, Role>>;
}

export type ProtocolInstance<Definition extends ProtocolDefinition> = Definition & {
  client(
    connection: JsonRpcConnectionLike,
    handlers?: ProtocolHandlers<Definition, "client">,
  ): ProtocolPeer<Definition, "client">;
  server(
    connection: JsonRpcConnectionLike,
    handlers?: ProtocolHandlers<Definition, "server">,
  ): ProtocolPeer<Definition, "server">;
};

export function request<const Method extends string>(method: Method) {
  return function defineRequest<Params = void, Result = void, Error = void>() {
    return new RequestType<Params, Result, Error>(method) as ProtocolRequest<
      Method,
      Params,
      Result,
      Error
    >;
  };
}

export function notification<const Method extends string>(method: Method) {
  return function defineNotification<Params = void>() {
    return new NotificationType<Params>(method) as ProtocolNotification<Method, Params>;
  };
}

export interface ProtocolFactories {
  request: typeof request;
  notification: typeof notification;
}

export function createProtocol<const Definition extends ProtocolDefinition>(
  factory: (factories: ProtocolFactories) => Definition,
): ProtocolInstance<Definition>;
export function createProtocol<const Definition extends ProtocolDefinition>(
  definition: Definition,
): ProtocolInstance<Definition>;
export function createProtocol<const Definition extends ProtocolDefinition>(
  definitionOrFactory: Definition | ((factories: ProtocolFactories) => Definition),
): ProtocolInstance<Definition> {
  const resolvedDefinition = normalizeProtocolDefinition(
    typeof definitionOrFactory === "function"
      ? definitionOrFactory({
          request,
          notification,
        })
      : definitionOrFactory,
  );

  return {
    ...resolvedDefinition,
    client(connection, handlers) {
      bindHandlers(connection, inboundFor(resolvedDefinition, "client"), handlers);
      return createPeer(connection, outboundFor(resolvedDefinition, "client")) as ProtocolPeer<
        Definition,
        "client"
      >;
    },
    server(connection, handlers) {
      bindHandlers(connection, inboundFor(resolvedDefinition, "server"), handlers);
      return createPeer(connection, outboundFor(resolvedDefinition, "server")) as ProtocolPeer<
        Definition,
        "server"
      >;
    },
  } as ProtocolInstance<Definition>;
}

function outboundFor(definition: ProtocolDefinition, role: "client" | "server") {
  return role === "client"
    ? {
        requests: {
          ...(definition.clientToServer.requests || {}),
          ...(definition.bidirectional.requests || {}),
        },
        notifications: {
          ...(definition.clientToServer.notifications || {}),
          ...(definition.bidirectional.notifications || {}),
        },
      }
    : {
        requests: {
          ...(definition.serverToClient.requests || {}),
          ...(definition.bidirectional.requests || {}),
        },
        notifications: {
          ...(definition.serverToClient.notifications || {}),
          ...(definition.bidirectional.notifications || {}),
        },
      };
}

function inboundFor(definition: ProtocolDefinition, role: "client" | "server") {
  return role === "client"
    ? {
        requests: {
          ...(definition.serverToClient.requests || {}),
          ...(definition.bidirectional.requests || {}),
        },
        notifications: {
          ...(definition.serverToClient.notifications || {}),
          ...(definition.bidirectional.notifications || {}),
        },
      }
    : {
        requests: {
          ...(definition.clientToServer.requests || {}),
          ...(definition.bidirectional.requests || {}),
        },
        notifications: {
          ...(definition.clientToServer.notifications || {}),
          ...(definition.bidirectional.notifications || {}),
        },
      };
}

function normalizeProtocolDefinition(definition: ProtocolDefinition): ProtocolDefinition {
  return {
    clientToServer: {
      requests: definition.clientToServer.requests || {},
      notifications: definition.clientToServer.notifications || {},
    },
    serverToClient: {
      requests: definition.serverToClient.requests || {},
      notifications: definition.serverToClient.notifications || {},
    },
    bidirectional: {
      requests: definition.bidirectional.requests || {},
      notifications: definition.bidirectional.notifications || {},
    },
  };
}

function bindHandlers(
  connection: JsonRpcConnectionLike,
  inbound: ProtocolDirection,
  handlers?: {
    requests?: Record<string, unknown>;
    notifications?: Record<string, unknown>;
  },
) {
  for (const definition of Object.values(inbound.requests || {})) {
    const handler = getByMethodPath(handlers?.requests, definition.method);
    if (typeof handler === "function") {
      connection.onRequest(definition, (...params) => handler(...params));
    }
  }

  for (const definition of Object.values(inbound.notifications || {})) {
    const handler = getByMethodPath(handlers?.notifications, definition.method);
    if (typeof handler === "function") {
      connection.onNotification(definition, (...params) => {
        void handler(...params);
      });
    }
  }
}

function createPeer(
  connection: JsonRpcConnectionLike,
  outbound: ProtocolDirection,
) {
  return {
    requests: createTree(
      Object.values(outbound.requests || {}),
      (definition) => (...params: unknown[]) => connection.sendRequest(definition, ...params),
    ),
    notifications: createTree(
      Object.values(outbound.notifications || {}),
      (definition) => (...params: unknown[]) => connection.sendNotification(definition, ...params),
    ),
  };
}

function createTree<T extends AnyProtocolMember>(
  definitions: T[],
  createLeaf: (definition: T) => unknown,
) {
  const root: Record<string, unknown> = {};

  for (const definition of definitions) {
    const path = definition.method.split("/");
    let cursor = root;

    for (const segment of path.slice(0, -1)) {
      cursor[segment] ??= {};
      cursor = cursor[segment] as Record<string, unknown>;
    }

    cursor[path.at(-1)!] = createLeaf(definition);
  }

  return root;
}

function getByMethodPath(value: unknown, method: string) {
  let cursor = value;

  for (const segment of method.split("/")) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

export type InferRequestParams<T extends AnyRequest> = RequestParams<T>;
export type InferRequestResult<T extends AnyRequest> = RequestResult<T>;
export type InferNotificationParams<T extends AnyNotification> = NotificationParams<T>;
