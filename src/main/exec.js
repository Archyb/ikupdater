const { spawn } = require('child_process');

/**
 * Gets the proper environment with common development tool paths
 */
function getSpawnEnv() {
	const currentPath = process.env.PATH || '';
	const commonPaths = [
		'/Users/arthurnoguera/Library/Application Support/Herd/bin', // Laravel Herd
		'/opt/homebrew/bin', // Homebrew on Apple Silicon
		'/usr/local/bin', // Homebrew on Intel
		'/Users/arthurnoguera/.phpenv/bin', // phpenv
		'/Users/arthurnoguera/.asdf/shims', // asdf
		'/Users/arthurnoguera/.phpbrew/bin' // phpbrew
	];
	
	let finalPath = currentPath;
	for (const path of commonPaths) {
		if (!finalPath.includes(path)) {
			finalPath = `${path}:${finalPath}`;
		}
	}
	
	return {
		...process.env,
		PATH: finalPath,
		GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes',
		GIT_TERMINAL_PROMPT: '0'
	};
}

/**
 * Spawns a process and returns a promise that resolves with captured stdout.
 * SSH prompts are disabled to avoid blocking prompts.
 */
function spawnCapture(cmd, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd, env: getSpawnEnv(), shell: false });
		let out = '';
		let err = '';
		child.stdout.on('data', d => out += d.toString());
		child.stderr.on('data', d => err += d.toString());
		child.on('error', (error) => {
			reject(new Error(`${cmd} not found or failed to start: ${error.message}`));
		});
		child.on('close', code => {
			if (code === 0) resolve(out);
			else reject(new Error(err || `${cmd} exited with ${code}`));
		});
	});
}

/**
 * Runs a sequence of commands, streaming output via onData callback per chunk.
 */
function runCommandSequence(cwd, sequence, onData) {
	return new Promise((resolve, reject) => {
		let index = 0;
		const runNext = () => {
			if (index >= sequence.length) return resolve();
			const { cmd, args } = sequence[index++];
			onData(`\n$ ${cmd} ${args.join(' ')}\n`);
			const child = spawn(cmd, args, { cwd, env: getSpawnEnv(), shell: false });
			child.stdout.on('data', (d) => onData(d.toString()));
			child.stderr.on('data', (d) => onData(d.toString()));
			child.on('error', (error) => {
				reject(new Error(`${cmd} not found or failed to start: ${error.message}`));
			});
			child.on('close', (code) => {
				if (code === 0) runNext();
				else reject(new Error(`${cmd} exited with code ${code}`));
			});
		};
		runNext();
	});
}

module.exports = { spawnCapture, runCommandSequence };


