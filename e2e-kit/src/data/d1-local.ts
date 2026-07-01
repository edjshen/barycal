import { execFileSync } from 'node:child_process';
import type { DataAdapter } from './types';

export interface D1LocalOptions {
  /** wrangler d1 database binding/name, e.g. 'barycal-db'. */
  database: string;
  /** Apply migrations before seeding (default true). */
  migrate?: boolean;
  /** Optional command to (re)generate the seed file, e.g. a gen-seed script. */
  generateSeed?: { cmd: string; args: string[] };
  /** SQL file to load into local D1, e.g. 'drizzle/seed.sql'. */
  seedFile?: string;
  cwd?: string;
}

/**
 * Cloudflare D1 (local miniflare) provisioning for barycal-style apps. Applies
 * migrations and loads a seed file into the same on-disk state `next dev`
 * reads, so the app boots against seeded data. Runs BEFORE the web server.
 */
export class D1LocalAdapter implements DataAdapter {
  constructor(private readonly opts: D1LocalOptions) {}

  async provision(): Promise<void> {
    const cwd = this.opts.cwd ?? process.cwd();
    const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

    if (this.opts.generateSeed) {
      run(this.opts.generateSeed.cmd, this.opts.generateSeed.args);
    }
    if (this.opts.migrate !== false) {
      run('npx', ['wrangler', 'd1', 'migrations', 'apply', this.opts.database, '--local']);
    }
    if (this.opts.seedFile) {
      run('npx', [
        'wrangler',
        'd1',
        'execute',
        this.opts.database,
        '--local',
        `--file=${this.opts.seedFile}`,
      ]);
    }
  }
}
