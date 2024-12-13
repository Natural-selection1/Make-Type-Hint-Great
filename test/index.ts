import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    try {
        const files = await new Promise<string[]>((resolve, reject) => {
            glob('**/**.test.js', { cwd: testsRoot }, (err, matches) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(matches);
                }
            });
        });

        // Add files to the test suite
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        return new Promise((c, e) => {
            try {
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}
