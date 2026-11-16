// The launchd agent that keeps `npm start` running on macOS, for someone who won't keep a terminal
// open. `scripts/launch-agent.ts` fills in this machine's paths at install time, so the plist is
// never committed: every path in it is absolute, and most sit under the home folder.

export const LAUNCH_AGENT_LABEL = 'local.anki-hebrew-card-creation';

export type LaunchAgent = {
  label: string;
  workingDirectory: string;
  /** The directory holding `node` and `npm`. */
  nodeBin: string;
  logFile: string;
};

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** The plist for a user agent that runs `npm start` at login, and again whenever it exits. */
export function launchAgentPlist({
  label,
  workingDirectory,
  nodeBin,
  logFile,
}: LaunchAgent): string {
  const [labelXml, directoryXml, binXml, logXml] = [label, workingDirectory, nodeBin, logFile].map(
    escapeXml,
  );
  // launchd starts an agent with almost no PATH. `npm` is a `#!/usr/bin/env node` script, and
  // `npm start` runs its command through `/bin/sh`, so both need `nodeBin` and the system's own.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${labelXml}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binXml}/npm</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${directoryXml}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${binXml}:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${logXml}</string>
  <key>StandardErrorPath</key>
  <string>${logXml}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
}
