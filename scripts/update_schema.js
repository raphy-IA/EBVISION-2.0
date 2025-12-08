require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function update() {
    const client = await pool.connect();
    try {
        console.log("🛠️  Updating Schema...");

        // Add sigle
        await client.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS sigle VARCHAR(50)");
        console.log("   ✅ Added 'sigle'");

        // Add secteur_activite (Text version for migration)
        await client.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS secteur_activite VARCHAR(255)");
        console.log("   ✅ Added 'secteur_activite'");

        // Add pays
        await client.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS pays VARCHAR(100)");
        console.log("   ✅ Added 'pays'");

        // Add code to internal_activities
        await client.query("ALTER TABLE internal_activities ADD COLUMN IF NOT EXISTS code VARCHAR(50)");
        console.log("   ✅ Added 'code' to internal_activities");

        // Create bu_internal_activities
        await client.query(`
            CREATE TABLE IF NOT EXISTS bu_internal_activities (
                business_unit_id UUID NOT NULL,
                internal_activity_id UUID NOT NULL,
                PRIMARY KEY (business_unit_id, internal_activity_id)
            )
        `);
        console.log("   ✅ Created 'bu_internal_activities'");

    } catch (e) {
        console.error("❌ Schema Update Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}
update();
