export interface Application {
  worker: object;
  server: object;
  auth: Auth;
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

export interface Auth {
  characters: string;
  secret: string;
  length: number;
  db: object;
}
