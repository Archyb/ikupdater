// Types pour les modules Node.js
declare module 'child_process' {
  export function spawn(command: string, args?: string[], options?: any): any;
}

declare module 'fs' {
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: any): void;
  export function readdirSync(path: string, options?: any): any[];
  export function rmSync(path: string, options?: any): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}
