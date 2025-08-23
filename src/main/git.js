const path = require('path');
const fs = require('fs');
const { spawnCapture } = require('./exec');

/**
 * Retourne la liste des branches locales + la branche courante.
 */
async function getBranches(projectPath) {
	if (!fs.existsSync(path.join(projectPath, '.git'))) {
		return { branches: [], current: '' };
	}

	// Pas de fetch ici -> on reste sur l'état local
	const currentRaw = (await spawnCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectPath)).trim();
	const current = currentRaw === 'HEAD' ? '' : currentRaw; // '' si detached HEAD

	// Liste strictement locale
	const raw = await spawnCapture('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], projectPath);

	const set = new Set();
	raw.split(/\r?\n/).map(s => s.trim()).forEach(name => {
		if (!name) return;
		set.add(name); // pas de "remotes/" ici : ce sont uniquement des locales
	});

	const unique = Array.from(set);

	// Tri avec priorités
	const priority = ['develop', 'main', 'master'];
	unique.sort((a, b) => {
		const ia = priority.indexOf(a), ib = priority.indexOf(b);
		if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
		return a.localeCompare(b);
	});

	return { branches: unique, current };
}

module.exports = { getBranches };
