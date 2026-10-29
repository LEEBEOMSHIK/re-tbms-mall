import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseWorkboard } from './workboard';

// Server components and route handlers only. No request value can select a file.
export async function readWorkboardSource(): Promise<string> {
  const cwd = process.cwd();
  const root = path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps'
    ? path.resolve(cwd, '../..') : cwd;
  return readFile(path.join(root, 'workboard.md'), 'utf8');
}
export async function readWorkboard() {
  const source = await readWorkboardSource();
  return { source, board: parseWorkboard(source) };
}