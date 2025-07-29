const fs = require('fs');
const path = require('path');
const filePath = path.join(process.cwd(), 'database/migrations/028_add_missing_client_columns.sql');

try {
    fs.unlinkSync(filePath);
    console.log('File deleted successfully.');
} catch (err) {
    console.error('Error deleting file:', err);
}