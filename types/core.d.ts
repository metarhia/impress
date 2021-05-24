export interface Application {
  worker: object;
  server: object;
  auth: object;
  resources: Map<string, Buffer>;
  introspect: () => Promise<any>;
}

export interface Context {
  client: Client;
  [key: string]: any;
}

export interface Client {
  events: { close: Array<Function> };
  callId: number;
  ip: string;
}
