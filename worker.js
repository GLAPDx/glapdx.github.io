function renderIndex(genomes) {
    contents = '';
    
    for (const genome of genomes) {
        contents += '>' + genome.name + '\n' + genome.sequence + '\n';
    }

    return contents;
}

function writeIndex(genomes) {
    contents = renderIndex(genomes);
    FS.writeFile('inputs/index.fa', contents);
}

function renderRef(genome) {
    return '>' + genome.name + '\n' + genome.sequence + '\n';
}

function writeRef(genome) {
    const contents = renderRef(genome);
    FS.writeFile('inputs/ref.fa', contents);
}

function renderGenomeNames(genomes) {
    contents = '';
    
    for (const genome of genomes) {
        contents += '>' + genome.name + '\n';
    }

    return contents;
}

function writeGenomeNames(genomes, filename) {
    contents = renderGenomeNames(genomes);
    FS.writeFile(filename, contents);
}

// Emscripten Module hooks

var Module = {
    'noInitialRun': true,
};

Module.print = (text) => {
    postMessage({
        'cmd': 'print',
        'text': text,
    });
}

Module.printErr = (text) => {
    postMessage({
        'cmd': 'printErr',
        'text': text,
    });
}

Module.onRuntimeInitialized = () => {
    self.onmessage = (e) => {
        // Parse message

        const { genomes, targetList, maxNumMismatchesInTarget, backgroundList, maxNumMismatchesInBackground, includeLoopPrimers, numPrimersToGenerate } = e.data;

        const [ref] = targetList.splice(0, 1);

        // Prepare inputs

        FS.mkdir('inputs')

        writeIndex(genomes);
        writeRef(ref)

        const hasTargetList = targetList.length > 0;
        if (hasTargetList) {
            writeGenomeNames(targetList, 'inputs/target.fa');
        }

        const hasBackgroundList = backgroundList.length > 0;
        if (hasBackgroundList) {
            writeGenomeNames(backgroundList, 'inputs/background.fa');
        }

        const args = [
            '--index', 'inputs/index.fa',
            '--ref', 'inputs/ref.fa',
            // --target is handled below
            '--maxNumMismatchesInTarget', maxNumMismatchesInTarget.toString(),
            // --backgroundMode is handled below
            // --backgroundListPath is handled below
            '--maxNumMismatchesInBackground', maxNumMismatchesInBackground.toString(),
            // --includeLoopPrimers is handled below
            '--numPrimersToGenerate', numPrimersToGenerate.toString(),
            '--numThreads', '1', // TODO fix pthreads, then use: String(navigator.hardwareConcurrency),
        ];
        
        if (hasTargetList)
            args.push('--target', 'inputs/target.fa');

        if (hasBackgroundList)
            args.push(
                '--backgroundMode', 'fromFile',
                '--backgroundListPath', 'inputs/background.fa');
        else
            args.push('--backgroundMode', 'none')

        if (includeLoopPrimers)
            args.push('--includeLoopPrimers');

        const exitCode = callMain(args);

        if (exitCode === 0) {
            let results = FS.readFile('success.txt', { encoding: 'utf8' });
            postMessage({
                'cmd': 'results',
                'results': results
            });
        }
    };
};

importScripts('glapd-web.js');
