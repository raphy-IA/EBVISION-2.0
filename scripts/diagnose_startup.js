try {
    require('../server.js');
} catch (e) {
    console.error('=== FULL ERROR ===');
    console.error(e.message);
    console.error('\n=== STACK ===');
    console.error(e.stack);
}
