const fs = require('fs');
const path = require('path');

async function fixOpportunityModel() {
    try {
        console.log('🔧 Correction du modèle Opportunity.js...');
        
        const modelPath = path.join(__dirname, '../src/models/Opportunity.js');
        let content = fs.readFileSync(modelPath, 'utf8');
        
        // Remplacer la méthode create pour correspondre à la structure réelle
        const newCreateMethod = `    static async create(data) {
        try {
            const query = \`
                INSERT INTO opportunities (
                    nom, description, client_id, collaborateur_id, business_unit_id, 
                    statut, type_opportunite, source, probabilite,
                    montant_estime, devise, date_fermeture_prevue, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            \`;
            
            const values = [
                data.nom,
                data.description,
                data.client_id,
                data.collaborateur_id,
                data.business_unit_id,
                data.statut || 'NOUVELLE',
                data.type_opportunite,
                data.source,
                data.probabilite || 0,
                data.montant_estime,
                data.devise || 'FCFA',
                data.date_fermeture_prevue,
                data.notes,
                data.created_by || null
            ];
            
            const result = await pool.query(query, values);
            const opportunity = new Opportunity(result.rows[0]);
            
            return opportunity;
        } catch (error) {
            console.error('Erreur lors de la création de l\\'opportunité:', error);
            throw error;
        }
    }`;
        
        // Remplacer la méthode create existante
        const createMethodRegex = /static async create\(data\) \{[\s\S]*?\n    \}/;
        content = content.replace(createMethodRegex, newCreateMethod);
        
        // Écrire le fichier corrigé
        fs.writeFileSync(modelPath, content, 'utf8');
        
        console.log('✅ Modèle Opportunity.js corrigé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
    }
}

fixOpportunityModel(); 