import { describe, expect, test } from 'vitest';
import { launchAgentPlist } from './launch-agent.ts';

describe('launchAgentPlist', () => {
  test('runs npm start from the clone, logging to one file', () => {
    const plist = launchAgentPlist({
      label: 'local.example',
      workingDirectory: '/opt/example/clone',
      nodeBin: '/opt/example/node/bin',
      logFile: '/opt/example/logs/example.log',
    });

    expect(plist).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>local.example</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/example/node/bin/npm</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/opt/example/clone</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/example/node/bin:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>/opt/example/logs/example.log</string>
  <key>StandardErrorPath</key>
  <string>/opt/example/logs/example.log</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`);
  });

  test('escapes a path that holds XML markup', () => {
    const plist = launchAgentPlist({
      label: 'local.example',
      workingDirectory: '/opt/example/Tom & <Jerry>',
      nodeBin: '/opt/example/node/bin',
      logFile: '/opt/example/logs/example.log',
    });

    expect(plist).toContain('<string>/opt/example/Tom &amp; &lt;Jerry&gt;</string>');
    expect(plist).not.toContain('Tom & <Jerry>');
  });
});
