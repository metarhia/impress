export interface LogConfig {
  keepDays: number;
  writeInterval: number;
  writeBuffer: number;
  toFile: Array<string>;
  toStdout: Array<string>;
}

export interface ScaleConfig {
  cloud: string;
  server: string;
  instance: 'standalone' | 'controller' | 'server';
  token: string;
  gc: number;
}

export interface ServerConfig {
  host: string;
  balancer: number;
  protocol: 'http' | 'https';
  ports: Array<number>;
  nagle: boolean;
  timeouts: {
    bind: number;
    start: number;
    stop: number;
    request: number;
    watch: number;
  };
  queue: {
    concurrency: number;
    size: number;
    timeout: number;
  };
  scheduler: {
    concurrency: number;
    size: number;
    timeout: number;
  };
  workers: {
    pool: number;
    wait: number;
    timeout: number;
  };
}

export interface SessionsConfig {
  sid: string;
  characters: string;
  length: number;
  secret: string;
  regenerate: number;
  expire: number;
  persistent: boolean;
  limits: {
    ip: number;
    user: number;
  };
}
