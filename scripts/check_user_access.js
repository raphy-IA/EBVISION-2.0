const pool = require('../src/utils/database');

async function checkUser(login) {
    try {
        const u = await pool.query("SELECT id, login, nom, prenom, role FROM users WHERE login = $1", [login]);
        if (u.rows.length === 0) {
            console.log(`User ${login} not found`);
            return;
        }
        const userId = u.rows[0].id;

        const roles = await pool.query(`
            SELECT r.name 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = $1
        `, [userId]);

        const buAccess = await pool.query(`
            SELECT bu.id, bu.nom, 'GRANTED' as source, uba.granted
            FROM user_business_unit_access uba
            JOIN business_units bu ON uba.business_unit_id = bu.id
            WHERE uba.user_id = $1
            UNION
            SELECT bu.id, bu.nom, 'PRIMARY' as source, true as granted
            FROM collaborateurs c
            JOIN business_units bu ON c.business_unit_id = bu.id
            WHERE c.user_id = $1
        `, [userId]);

        console.log('User Details:', u.rows[0]);
        console.log('Roles (Multi):', roles.rows.map(r => r.name));
        console.log('Authorized BUs:', buAccess.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkUser('aelang');
