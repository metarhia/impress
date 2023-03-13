import { EventEmitter, NodeJS } from 'node:events';

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

  on(event: 'loading', listener: (...args: any[]) => void): this;
  once(event: 'loading', listener: (...args: any[]) => void): this;
  on(event: 'loaded', listener: (...args: any[]) => void): this;
  once(event: 'loaded', listener: (...args: any[]) => void): this;
  on(event: 'started', listener: (...args: any[]) => void): this;
  once(event: 'started', listener: (...args: any[]) => void): this;
  on(event: 'initialized', listener: (...args: any[]) => void): this;
  once(event: 'initialized', listener: (...args: any[]) => void): this;
}
