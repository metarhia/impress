import { EventEmitter, NodeJS } from 'events';

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

export interface Application extends NodeJS.EventEmitter {
  worker: object;
  server: object;
  auth: object;
  resources: Map<string, Buffer>;
  introspect: () => Promise<any>;
  invoke: (target: InvokeTarget) => Promise<any>;
  scheduler: Scheduler;

  on(event: 'init', listener: (...args: any[]) => void): this;
  once(event: 'init', listener: (...args: any[]) => void): this;
  on(event: 'init-loaded', listener: (...args: any[]) => void): this;
  once(event: 'init-loaded', listener: (...args: any[]) => void): this;
  on(event: 'init-started', listener: (...args: any[]) => void): this;
  once(event: 'init-started', listener: (...args: any[]) => void): this;
  on(event: 'init-done', listener: (...args: any[]) => void): this;
  once(event: 'init-done', listener: (...args: any[]) => void): this;
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
