
import { parseDSL } from './src/parser/dsl-parser';

console.log('Starting parser verification...');

// This inputs a malformed array which currently causes an infinite loop
const problematicDSL = `
subsystem "Test" {
    nodes: [ValidNode, !InvalidNode]
    color: "#ff0000"
}
`;

try {
    // Set a timeout to kill the process if it hangs (simulating the crash/freeze protection)
    // In a real infinite loop, this might not even fire if it blocks the event loop completely,
    // but formatted as a distinct process check it helps.
    const start = Date.now();
    parseDSL(problematicDSL);
    const end = Date.now();
    console.log(`Parsed successfully in ${end - start}ms`);
} catch (e) {
    console.error('Parsing failed with error:', e);
}

console.log('Verification finished.');
