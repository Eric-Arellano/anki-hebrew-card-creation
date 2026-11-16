// `npm run launch-agent <install|uninstall|restart>`: keeps the built app running on macOS, through
// logins and crashes, as a launchd user agent. `launchctl` is always run through `execFile`, never
// a shell, so no path is ever parsed as a command.
import { execFile } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { LAUNCH_AGENT_LABEL, launchAgentPlist } from '#lib/server/launch-agent.ts';

const run = promisify(execFile);

const domain = `gui/${userInfo().uid}`;
const service = `${domain}/${LAUNCH_AGENT_LABEL}`;
const agentsDirectory = join(homedir(), 'Library', 'LaunchAgents');
const plistFile = join(agentsDirectory, `${LAUNCH_AGENT_LABEL}.plist`);
const logFile = join(homedir(), 'Library', 'Logs', `${LAUNCH_AGENT_LABEL}.log`);

function refuse(reason: string): never {
  console.error(reason);
  process.exit(1);
}

async function isExecutable(file: string): Promise<boolean> {
  try {
    await access(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Where the terminal finds `node`, not `process.execPath`: Homebrew's execPath is a versioned
// Cellar directory that the next `brew upgrade` deletes, while `/opt/homebrew/bin` outlives it.
async function nodeBinOnPath(): Promise<string | undefined> {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    const both = await Promise.all(
      ['node', 'npm'].map((name) => isExecutable(join(directory, name))),
    );
    if (both.every(Boolean)) return directory;
  }
  return undefined;
}

async function isLoaded(): Promise<boolean> {
  try {
    await run('launchctl', ['print', service]);
    return true;
  } catch {
    return false;
  }
}

async function bootout(): Promise<void> {
  if (await isLoaded()) await run('launchctl', ['bootout', service]);
}

async function install(): Promise<void> {
  if (!existsSync('build')) refuse('There is no build/ here yet. Run `npm run build` first.');
  const nodeBin = await nodeBinOnPath();
  if (nodeBin === undefined)
    refuse("Couldn't find a directory on your PATH with both node and npm.");

  await mkdir(agentsDirectory, { recursive: true });
  const plist = launchAgentPlist({
    label: LAUNCH_AGENT_LABEL,
    workingDirectory: process.cwd(),
    nodeBin,
    logFile,
  });
  await writeFile(plistFile, plist);
  await bootout();
  await run('launchctl', ['bootstrap', domain, plistFile]);
  console.log(`Installed. Open http://127.0.0.1:3000. It logs to ${logFile}.`);
}

async function uninstall(): Promise<void> {
  await bootout();
  await rm(plistFile, { force: true });
  console.log('Uninstalled.');
}

async function restart(): Promise<void> {
  if (!(await isLoaded())) refuse("It isn't installed. Run `npm run launch-agent install`.");
  await run('launchctl', ['kickstart', '-k', service]);
  console.log('Restarted.');
}

const commands: Record<string, () => Promise<void>> = { install, uninstall, restart };
const command = commands[process.argv[2] ?? ''];
if (command === undefined) refuse('Usage: npm run launch-agent <install|uninstall|restart>');
await command();
