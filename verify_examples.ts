
import { parseDSL, validateTopology } from './src/parser/dsl-parser.ts';
import { EXAMPLES } from './src/examples/sample-flows.ts';

console.log('Starting examples verification...');

const examples = Object.entries(EXAMPLES);
let errorCount = 0;

for (const [name, dsl] of examples) {
    console.log(`\nVerifying example: ${name}`);
    try {
        const topology = parseDSL(dsl);
        if (topology.errors && topology.errors.length > 0) {
            console.error(`Parsed with syntax errors in ${name}:`);
            topology.errors.forEach(e => console.error(`  Line ${e.line}: ${e.message}`));
            errorCount++;
        } else {
            const validation = validateTopology(topology);
            if (!validation.valid) {
                console.error(`Validation failed for ${name}:`);
                validation.errors.forEach(e => console.error(`  ${e}`));
                errorCount++;
            } else {
                console.log(`✅ ${name} passed validation.`);
            }
        }
    } catch (e) {
        console.error(`Crash while parsing ${name}:`, e);
        errorCount++;
    }
}

console.log(`\nVerification finished. ${errorCount} examples failed.`);
if (errorCount > 0) process.exit(1);
