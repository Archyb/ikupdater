const path = require('path');
const fs = require('fs');
const { spawnCapture } = require('./exec');

/**
 * Returns list of branches and current branch for given repo path.
 */
async function getBranches(projectPath) {
	if (!fs.existsSync(path.join(projectPath, '.git'))) {
		return { branches: [], current: '' };
	}
	try { await spawnCapture('git', ['fetch', '--all', '--prune'], projectPath); } catch {}
	const current = (await spawnCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectPath)).trim();
	const raw = await spawnCapture('git', ['branch', '-a', '--format=%(refname:short)'], projectPath);
	const set = new Set();
	raw.split(/\r?\n/).map(s => s.trim()).forEach(line => {
		if (!line || line.includes('->')) return;
		set.add(line);
	});
	const names = Array.from(set).map(name => name.replace(/^remotes\//, ''));
	const unique = Array.from(new Set(names));
	const priority = ['develop', 'main', 'master'];
	unique.sort((a, b) => {
		const ia = priority.indexOf(a);
		const ib = priority.indexOf(b);
		if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
		return a.localeCompare(b);
	});
	return { branches: unique, current };
}

module.exports = { getBranches };


