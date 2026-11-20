// Asks the same questions of Papa Dorin on two models, with only his own character notes (papa-dorin.md) as his
// instructions, through the owner's Claude subscription (Claude Code). Prints the answers side by side.
//
//   node scripts/app/papa-dorin-chat/compare.mjs [models] [efforts]   # e.g. claude-sonnet-5-5 low,medium
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.join(import.meta.dirname, '..', '..', '..');
const NOTES = path.join(ROOT, 'scripts', 'dough-maker', 'lesson-docs', 'papa-dorin.md');
const npmRoot = spawnSync('npm root -g', { encoding: 'utf8', shell: true }).stdout.trim();
const EXE = path.join(npmRoot, '@anthropic-ai', 'claude-code', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');

const MODELS = (process.argv[2] ?? 'claude-haiku-5-5,claude-sonnet-5-5').split(',');
const EFFORTS = (process.argv[3] ?? 'low').split(',');
const QUESTIONS = ['Why did Jonah run the other way?', 'Tell me about David and Goliath.', 'Who was Deborah?', 'Why did Peter deny Jesus?', 'Tell me a joke about your mustache.'];

/** Asks one question of one model, from an empty folder and without an API key, so it uses the subscription. */
function ask(model, effort, question) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const args = ['-p', question, '--model', model, '--effort', effort, '--system-prompt-file', NOTES, '--output-format', 'json', '--tools', '', '--no-session-persistence', '--strict-mcp-config'];
  return new Promise((resolve) => {
    const child = spawn(EXE, args, { cwd: os.tmpdir(), env, windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => {
      try {
        resolve(JSON.parse(out).result.trim());
      } catch {
        resolve(`(no answer) ${out.slice(0, 200)}`);
      }
    });
  });
}

for (const q of QUESTIONS) {
  const runs = MODELS.flatMap((m) => EFFORTS.map((e) => ({ m, e })));
  const answers = await Promise.all(runs.map((r) => ask(r.m, r.e, q)));
  console.log(`\n######## ${q}`);
  runs.forEach((r, i) => console.log(`\n--- ${r.m} (${r.e} effort)\n${answers[i]}`));
}
