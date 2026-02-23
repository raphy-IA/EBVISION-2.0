const { pool } = require('../src/utils/database');

async function checkUserRoles() {
    try {
        console.log('--- RECHERCHE DES RÔLES D\'EMILE BITOUNGUI ---');
        const res = await pool.query(`
            SELECT r.id, r.name 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            JOIN users u ON ur.user_id = u.id 
            WHERE u.nom = 'Bitoungui' OR u.email LIKE 'ebitoungui%'
        `);

        console.log(`Nombre de rôles trouvés: ${res.rows.length}`);
        res.rows.forEach(r => {
            console.log(`- Role ID: ${r.id} | Name: ${r.name}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkUserRoles();
