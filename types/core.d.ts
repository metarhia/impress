export interface Task {
  name: string;
  every: string;
  args: object;
  run: string;
}

export interface Scheduler {
  add(task: Task): Promise<string>;
  remove(id: string): void;
  stop(name: string): void;
}

export interface InvokeTarget {
  method: string;
  args: object;
}

export interface Application {
  worker: object;
  server: object;
  auth: object;
  resources: Map<string, Buffer>;
  introspect: () => Promise<any>;
  invoke: (target: InvokeTarget) => Promise<any>;
  scheduler: Scheduler;
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
