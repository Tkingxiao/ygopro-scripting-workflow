import { existsSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

export interface GitRepo {
  dir: string;
  url: string;
  branch?: string;
}

export function run(command: string, args: string[], cwd = process.cwd()) {
  console.log(`$ ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with exit code ${result.status}`,
    );
  }
}

export function prepareGitRepo({ dir, url, branch = 'master' }: GitRepo) {
  if (!existsSync(dir)) {
    run('git', ['clone', url, dir]);
  }

  if (!statSync(dir).isDirectory()) {
    throw new Error(`${dir} already exists, but it is not a directory.`);
  }

  if (!existsSync(resolve(dir, '.git'))) {
    throw new Error(`${dir} already exists, but it is not a git repository.`);
  }

  run('git', ['remote', 'set-url', 'origin', url], dir);
  run(
    'git',
    [
      'fetch',
      '--prune',
      'origin',
      `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
    ],
    dir,
  );
  run('git', ['checkout', '-B', branch, `origin/${branch}`], dir);
  run('git', ['reset', '--hard', `origin/${branch}`], dir);
}
