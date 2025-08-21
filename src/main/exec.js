const { spawn } = require('child_process');

/**
 * Spawns a process and returns a promise that resolves with captured stdout.
 * SSH prompts are disabled to avoid blocking prompts.
 */
function spawnCapture(cmd, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd, env: {
			...process.env,
			GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes',
			GIT_TERMINAL_PROMPT: '0'
		}, shell: false });
		let out = '';
		let err = '';
		child.stdout.on('data', d => out += d.toString());
		child.stderr.on('data', d => err += d.toString());
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
			const child = spawn(cmd, args, { cwd, env: {
				...process.env,
				GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes',
				GIT_TERMINAL_PROMPT: '0'
			}, shell: false });
			child.stdout.on('data', (d) => onData(d.toString()));
			child.stderr.on('data', (d) => onData(d.toString()));
			child.on('close', (code) => {
				if (code === 0) runNext();
				else reject(new Error(`${cmd} exited with code ${code}`));
			});
		};
		runNext();
	});
}

module.exports = { spawnCapture, runCommandSequence };


