import { EventEmitter } from 'node:events';

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

export interface Static {
  get(name: string): unknown;
}

export interface Schemas {
  get(name: string): unknown;
}

export interface Listener {
  (...args: Array<unknown>): void;
}

export interface Application extends EventEmitter {
  worker: { id: string };
  server: { host: string; port: number; protocol: string };
  resources: Static;
  schemas: Schemas;
  scheduler: Scheduler;
  introspect: () => Promise<object>;
  invoke: (target: InvokeTarget) => Promise<unknown>;
  on(event: 'loading', listener: Listener): this;
  once(event: 'loading', listener: Listener): this;
  on(event: 'loaded', listener: Listener): this;
  once(event: 'loaded', listener: Listener): this;
  on(event: 'started', listener: Listener): this;
  once(event: 'started', listener: Listener): this;
  on(event: 'initialized', listener: Listener): this;
  once(event: 'initialized', listener: Listener): this;
}
