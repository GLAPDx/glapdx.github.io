// This file is generated from worker.template.js

// Emscripten Module hooks

var Module = {
    noInitialRun: true,
};

Module.print = text => {
    postMessage({
        cmd: 'print',
        text: text,
    });
};

Module.printErr = text => {
    postMessage({
        cmd: 'printErr',
        text: text,
    });
};

Module.onRuntimeInitialized = () => {
    postMessage({ cmd: 'ready' });

    self.onmessage = e => {
        // Parse message

        const {
            targetFileContents,
            refName,
            backgroundFileContents,
            maxNumMismatchesInTarget,
            maxNumMismatchesInBackground,
            includeLoopPrimers,
            numPrimersToGenerate,
        } = e.data;

        // Prepare inputs

        FS.mkdir('inputs');
        FS.writeFile('inputs/target_full.fa', targetFileContents);
        if (backgroundFileContents) FS.writeFile('inputs/background_full.fa', backgroundFileContents);

        const args = [
            '--target',
            'inputs/target_full.fa',
            '--ref',
            refName,
            // --background is handled below
            '--maxNumMismatchesInTarget',
            maxNumMismatchesInTarget.toString(),
            '--maxNumMismatchesInBackground',
            maxNumMismatchesInBackground.toString(),
            // --includeLoopPrimers is handled below
            '--numPrimersToGenerate',
            numPrimersToGenerate.toString(),
            '--numThreads',
            '1', // TODO fix pthreads, then use: String(navigator.hardwareConcurrency),
        ];

        if (backgroundFileContents) args.push('--background', 'inputs/background_full.fa');

        if (includeLoopPrimers) args.push('--includeLoopPrimers');

        console.log('About to launch GLAPD', args);

        const exitCode = callMain(args);

        console.log(`GLAPD exit code: ${exitCode}`);

        const tryRead = (path, encoding) => {
            try {
                return FS.readFile(path, { encoding });
            } catch (e) {
                return null;
            }
        };

        if (exitCode === 0) {
            const results = tryRead('success.txt', 'utf8');
            const workspaceZip = tryRead('workspace.zip', 'binary');
            postMessage({
                cmd: 'results',
                args: { results, workspaceZip },
            });
        } else {
            postMessage({
                cmd: 'error',
                message: `GLAPD exited with code ${exitCode}`,
            });
        }
    };
};

importScripts('portable-glapd-6e6643f.js');
