// Commit en push de bijgewerkte site-data naar GitHub (GitHub Pages serveert docs/).
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib/config.mjs';

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
try {
  git('rev-parse', '--is-inside-work-tree');
} catch {
  console.error('Dit is nog geen git-repository. Zie README.md, stap "Online zetten".');
  process.exit(1);
}
git('add', 'docs');
if (!git('status', '--porcelain', 'docs')) {
  console.log('Niets nieuws om te publiceren.');
} else {
  git('commit', '-m', `Data bijgewerkt ${new Date().toISOString().slice(0, 10)}`);
  console.log(git('push'));
  console.log('Gepubliceerd.');
}
