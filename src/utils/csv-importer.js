const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { query } = require('./database');
const bcrypt = require('bcryptjs');

/**
 * Système d'importation CSV pour EB-Vision 2.0
 */
class CSVImporter {
    constructor() {
        this.importStats = {
            totalFiles: 0,
            processedFiles: 0,
            totalRows: 0,
            importedRows: 0,
            errors: [],
            warnings: []
        };
    }

    /**
     * Importer tous les fichiers CSV
     */
    async importAllCSV() {
        console.log('🔄 DÉBUT DE L\'IMPORTATION DES DONNÉES CSV\n');

        try {
            // 1. Importer les divisions (créer les divisions de base)
            await this.importDivisions();

            // 2. Importer les utilisateurs depuis initiales.csv
            await this.importUsers();

            // 3. Importer les taux horaires
            await this.importHourlyRates();

            // 4. Importer les clients (depuis les données TRS)
            await this.importClients();

            // 5. Importer les missions
            await this.importMissions();

            // 6. Importer les saisies de temps (TRS)
            await this.importTimeEntries();

            // 7. Importer les factures
            await this.importInvoices();

            // 8. Importer les opportunités
            await this.importOpportunities();

            console.log('\n✅ IMPORTATION TERMINÉE AVEC SUCCÈS !');
            this.printImportStats();

        } catch (error) {
            console.error('❌ Erreur lors de l\'importation:', error);
            throw error;
        }
    }

    /**
     * Importer les divisions de base
     */
    async importDivisions() {
        console.log('🏢 Importation des divisions...');

        const divisions = [
            { nom: 'Audit', code: 'AUDIT', budget_annuel: 0 },
            { nom: 'Comptabilité', code: 'COMPTA', budget_annuel: 0 },
            { nom: 'Finance', code: 'FINANCE', budget_annuel: 0 },
            { nom: 'Juridique', code: 'JURIDIQUE', budget_annuel: 0 },
            { nom: 'Tax', code: 'TAX', budget_annuel: 0 },
            { nom: 'Gouvernance', code: 'GOV', budget_annuel: 0 }
        ];

        for (const division of divisions) {
            try {
                await query(
                    'INSERT INTO divisions (nom, code, budget_annuel) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
                    [division.nom, division.code, division.budget_annuel]
                );
            } catch (error) {
                this.importStats.errors.push(`Division ${division.nom}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${divisions.length} divisions créées`);
    }

    /**
     * Importer les utilisateurs depuis initiales.csv
     */
    async importUsers() {
        console.log('👥 Importation des utilisateurs...');

        const filePath = path.join(process.cwd(), 'initiales.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier initiales.csv non trouvé, création d\'utilisateurs par défaut');
            await this.createDefaultUsers();
            return;
        }

        const users = await this.readCSV(filePath);
        let importedCount = 0;

        for (const userData of users) {
            try {
                // Mapper les données
                const user = {
                    nom: userData.Nom || userData.nom || '',
                    prenom: userData.Prénom || userData.prenom || '',
                    email: userData.Email || userData.email || `${userData.Initiales || userData.initiales}@eb-vision.com`,
                    initiales: userData.Initiales || userData.initiales || '',
                    grade: this.mapGrade(userData.Grade || userData.grade || 'ASSISTANT'),
                    division_id: await this.getDivisionId(userData.Division || userData.division || 'AUDIT'),
                    date_embauche: new Date().toISOString().split('T')[0], // Date actuelle par défaut
                    taux_horaire: parseFloat(userData['Taux horaire'] || userData.taux_horaire || 0) || 0,
                    statut: 'ACTIF'
                };

                // Hasher le mot de passe par défaut
                const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
                const passwordHash = await bcrypt.hash('Password123!', saltRounds);

                // Insérer l'utilisateur
                const result = await query(
                    `INSERT INTO users (nom, prenom, email, password_hash, initiales, grade, division_id, date_embauche, taux_horaire, statut)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (email) DO NOTHING
                     RETURNING id`,
                    [user.nom, user.prenom, user.email, passwordHash, user.initiales, user.grade, user.division_id, user.date_embauche, user.taux_horaire, user.statut]
                );

                if (result.rows.length > 0) {
                    importedCount++;
                }

            } catch (error) {
                this.importStats.errors.push(`Utilisateur ${userData.Initiales || userData.initiales}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} utilisateurs importés`);
    }

    /**
     * Créer des utilisateurs par défaut
     */
    async createDefaultUsers() {
        const defaultUsers = [
            { nom: 'Dupont', prenom: 'Jean', initiales: 'JD', grade: 'MANAGER', division: 'AUDIT' },
            { nom: 'Martin', prenom: 'Marie', initiales: 'MM', grade: 'SENIOR', division: 'COMPTA' },
            { nom: 'Bernard', prenom: 'Pierre', initiales: 'PB', grade: 'ASSISTANT', division: 'FINANCE' }
        ];

        for (const user of defaultUsers) {
            try {
                const division_id = await this.getDivisionId(user.division);
                const email = `${user.initiales}@eb-vision.com`;
                const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
                const passwordHash = await bcrypt.hash('Password123!', saltRounds);

                await query(
                    `INSERT INTO users (nom, prenom, email, password_hash, initiales, grade, division_id, date_embauche, taux_horaire, statut)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (email) DO NOTHING`,
                    [user.nom, user.prenom, email, passwordHash, user.initiales, user.grade, division_id, new Date().toISOString().split('T')[0], 0, 'ACTIF']
                );
            } catch (error) {
                this.importStats.errors.push(`Utilisateur par défaut ${user.initiales}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${defaultUsers.length} utilisateurs par défaut créés`);
    }

    /**
     * Importer les taux horaires
     */
    async importHourlyRates() {
        console.log('💰 Importation des taux horaires...');

        const filePath = path.join(process.cwd(), 'Taux horaire par grade.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier Taux horaire par grade.csv non trouvé, création de taux par défaut');
            await this.createDefaultHourlyRates();
            return;
        }

        const rates = await this.readCSV(filePath);
        let importedCount = 0;

        for (const rateData of rates) {
            try {
                const rate = {
                    grade: this.mapGrade(rateData.Grade || rateData.grade || 'ASSISTANT'),
                    taux_horaire: parseFloat(rateData['Taux horaire'] || rateData.taux_horaire || 0) || 0,
                    date_effet: new Date().toISOString().split('T')[0],
                    statut: 'ACTIF'
                };

                await query(
                    `INSERT INTO hourly_rates (grade, taux_horaire, date_effet, statut)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (grade, date_effet) DO NOTHING`,
                    [rate.grade, rate.taux_horaire, rate.date_effet, rate.statut]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Taux horaire ${rateData.Grade || rateData.grade}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} taux horaires importés`);
    }

    /**
     * Créer des taux horaires par défaut
     */
    async createDefaultHourlyRates() {
        const defaultRates = [
            { grade: 'ASSISTANT', taux: 50 },
            { grade: 'SENIOR', taux: 75 },
            { grade: 'MANAGER', taux: 100 },
            { grade: 'DIRECTOR', taux: 150 },
            { grade: 'PARTNER', taux: 200 }
        ];

        for (const rate of defaultRates) {
            try {
                await query(
                    `INSERT INTO hourly_rates (grade, taux_horaire, date_effet, statut)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (grade, date_effet) DO NOTHING`,
                    [rate.grade, rate.taux, new Date().toISOString().split('T')[0], 'ACTIF']
                );
            } catch (error) {
                this.importStats.errors.push(`Taux par défaut ${rate.grade}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${defaultRates.length} taux horaires par défaut créés`);
    }

    /**
     * Importer les clients depuis les données TRS
     */
    async importClients() {
        console.log('🏢 Importation des clients...');

        const filePath = path.join(process.cwd(), 'données_TRS.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier données_TRS.csv non trouvé');
            return;
        }

        const trsData = await this.readCSV(filePath);
        const clients = new Set();

        // Extraire les noms de clients des données TRS
        trsData.forEach(row => {
            const clientName = row['Missions'] || row['missions'] || '';
            if (clientName && clientName.trim()) {
                clients.add(clientName.trim());
            }
        });

        let importedCount = 0;

        for (const clientName of clients) {
            try {
                const client = {
                    raison_sociale: clientName,
                    siret: this.generateSiret(), // Générer un SIRET fictif
                    secteur_activite: 'Non spécifié',
                    effectif: 1,
                    ca_annuel: 0,
                    adresse: 'Adresse non spécifiée',
                    pays: 'France',
                    statut: 'CLIENT'
                };

                await query(
                    `INSERT INTO clients (raison_sociale, siret, secteur_activite, effectif, ca_annuel, adresse, pays, statut)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (siret) DO NOTHING`,
                    [client.raison_sociale, client.siret, client.secteur_activite, client.effectif, client.ca_annuel, client.adresse, client.pays, client.statut]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Client ${clientName}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} clients importés`);
    }

    /**
     * Importer les missions
     */
    async importMissions() {
        console.log('🎯 Importation des missions...');

        const filePath = path.join(process.cwd(), 'liste des missions.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier liste des missions.csv non trouvé');
            return;
        }

        const missions = await this.readCSV(filePath);
        let importedCount = 0;

        for (const missionData of missions) {
            try {
                const mission = {
                    code: missionData.Code || missionData.code || this.generateMissionCode(),
                    nom: missionData.Nom || missionData.nom || missionData.Description || missionData.description || 'Mission sans nom',
                    description: missionData.Description || missionData.description || '',
                    client_id: await this.getClientId(missionData.Client || missionData.client || ''),
                    division_id: await this.getDivisionId(missionData.Division || missionData.division || 'AUDIT'),
                    date_debut: this.parseDate(missionData['Date début'] || missionData.date_debut || missionData.Date || missionData.date),
                    date_fin: this.parseDate(missionData['Date fin'] || missionData.date_fin),
                    budget_estime: parseFloat(missionData['Budget estimé'] || missionData.budget_estime || 0) || 0,
                    statut: this.mapMissionStatus(missionData.Statut || missionData.statut || 'EN_COURS'),
                    priorite: 'NORMALE'
                };

                await query(
                    `INSERT INTO missions (code, nom, description, client_id, division_id, date_debut, date_fin, budget_estime, statut, priorite)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (code) DO NOTHING`,
                    [mission.code, mission.nom, mission.description, mission.client_id, mission.division_id, mission.date_debut, mission.date_fin, mission.budget_estime, mission.statut, mission.priorite]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Mission ${missionData.Code || missionData.code}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} missions importées`);
    }

    /**
     * Importer les saisies de temps (TRS)
     */
    async importTimeEntries() {
        console.log('⏰ Importation des saisies de temps...');

        const filePath = path.join(process.cwd(), 'données_TRS.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier données_TRS.csv non trouvé');
            return;
        }

        const trsData = await this.readCSV(filePath);
        let importedCount = 0;

        for (const trsRow of trsData) {
            try {
                const timeEntry = {
                    user_id: await this.getUserId(trsRow.Initiales || trsRow.initiales || ''),
                    mission_id: await this.getMissionId(trsRow['Code Mission'] || trsRow.code_mission || trsRow.Missions || trsRow.missions || ''),
                    date_saisie: this.parseDate(trsRow.Mois || trsRow.mois || trsRow.Date || trsRow.date),
                    heures: parseFloat(trsRow.Heures || trsRow.heures || 0) || 0,
                    type_heures: this.mapHourType(trsRow['Type Heure'] || trsRow.type_heure || 'NORMALES'),
                    description: trsRow.Missions || trsRow.missions || '',
                    perdiem: parseFloat(trsRow.Perdiem || trsRow.perdiem || 0) || 0,
                    transport: parseFloat(trsRow.Transport || trsRow.transport || 0) || 0,
                    hotel: parseFloat(trsRow.Hotel || trsRow.hotel || 0) || 0,
                    restaurant: parseFloat(trsRow.Restaurant || trsRow.restaurant || 0) || 0,
                    divers: parseFloat(trsRow.Divers || trsRow.divers || 0) || 0
                    // REMOVED: statut - this column does not exist in time_entries table
                };

                // Vérifier que l'utilisateur existe
                if (!timeEntry.user_id) {
                    this.importStats.warnings.push(`Utilisateur non trouvé pour les initiales: ${trsRow.Initiales || trsRow.initiales}`);
                    continue;
                }

                await query(
                    `INSERT INTO time_entries (user_id, mission_id, date_saisie, heures, type_heures, description, perdiem, transport, hotel, restaurant, divers)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [timeEntry.user_id, timeEntry.mission_id, timeEntry.date_saisie, timeEntry.heures, timeEntry.type_heures, timeEntry.description, timeEntry.perdiem, timeEntry.transport, timeEntry.hotel, timeEntry.restaurant, timeEntry.divers]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Saisie de temps ${trsRow.Initiales || trsRow.initiales}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} saisies de temps importées`);
    }

    /**
     * Importer les factures
     */
    async importInvoices() {
        console.log('🧾 Importation des factures...');

        const filePath = path.join(process.cwd(), 'liste des factures.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier liste des factures.csv non trouvé');
            return;
        }

        const invoices = await this.readCSV(filePath);
        let importedCount = 0;

        for (const invoiceData of invoices) {
            try {
                const invoice = {
                    numero: invoiceData.Numéro || invoiceData.numero || invoiceData.Numero || this.generateInvoiceNumber(),
                    client_id: await this.getClientId(invoiceData.Client || invoiceData.client || ''),
                    mission_id: await this.getMissionId(invoiceData.Mission || invoiceData.mission || ''),
                    date_emission: this.parseDate(invoiceData['Date émission'] || invoiceData.date_emission || invoiceData.Date || invoiceData.date),
                    date_echeance: this.parseDate(invoiceData['Date échéance'] || invoiceData.date_echeance || invoiceData.Date || invoiceData.date),
                    montant_ht: parseFloat(invoiceData['Montant HT'] || invoiceData.montant_ht || invoiceData.Montant || invoiceData.montant || 0) || 0,
                    montant_tva: parseFloat(invoiceData['Montant TVA'] || invoiceData.montant_tva || 0) || 0,
                    montant_ttc: parseFloat(invoiceData['Montant TTC'] || invoiceData.montant_ttc || 0) || 0,
                    statut: this.mapInvoiceStatus(invoiceData.Statut || invoiceData.statut || 'EMISE'),
                    mode_paiement: invoiceData['Mode paiement'] || invoiceData.mode_paiement || '',
                    notes: invoiceData.Notes || invoiceData.notes || ''
                };

                // Calculer le montant TTC si non fourni
                if (invoice.montant_ttc === 0 && invoice.montant_ht > 0) {
                    invoice.montant_ttc = invoice.montant_ht + invoice.montant_tva;
                }

                await query(
                    `INSERT INTO invoices (numero, client_id, mission_id, date_emission, date_echeance, montant_ht, montant_tva, montant_ttc, statut, mode_paiement, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     ON CONFLICT (numero) DO NOTHING`,
                    [invoice.numero, invoice.client_id, invoice.mission_id, invoice.date_emission, invoice.date_echeance, invoice.montant_ht, invoice.montant_tva, invoice.montant_ttc, invoice.statut, invoice.mode_paiement, invoice.notes]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Facture ${invoiceData.Numéro || invoiceData.numero}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} factures importées`);
    }

    /**
     * Importer les opportunités
     */
    async importOpportunities() {
        console.log('🎯 Importation des opportunités...');

        const filePath = path.join(process.cwd(), 'liste des opportunités.csv');

        if (!fs.existsSync(filePath)) {
            console.log('   ⚠️  Fichier liste des opportunités.csv non trouvé');
            return;
        }

        const opportunities = await this.readCSV(filePath);
        let importedCount = 0;

        for (const oppData of opportunities) {
            try {
                const opportunity = {
                    nom: oppData.Opportunité || oppData.opportunite || oppData.Nom || oppData.nom || 'Opportunité sans nom',
                    description: oppData.Description || oppData.description || '',
                    client_id: await this.getClientId(oppData.Client || oppData.client || ''),
                    montant_estime: parseFloat(oppData['Montant estimé'] || oppData.montant_estime || oppData.Montant || oppData.montant || 0) || 0,
                    probabilite: parseInt(oppData.Probabilité || oppData.probabilite || 50) || 50,
                    date_creation: this.parseDate(oppData['Date création'] || oppData.date_creation || oppData.Date || oppData.date),
                    date_fermeture_prevue: this.parseDate(oppData['Date fermeture'] || oppData.date_fermeture),
                    source: oppData.Source || oppData.source || '',
                    statut: this.mapOpportunityStatus(oppData.Statut || oppData.statut || 'OUVERTE')
                };

                await query(
                    `INSERT INTO opportunities (nom, description, client_id, montant_estime, probabilite, date_creation, date_fermeture_prevue, source, statut)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (nom, client_id) DO NOTHING`,
                    [opportunity.nom, opportunity.description, opportunity.client_id, opportunity.montant_estime, opportunity.probabilite, opportunity.date_creation, opportunity.date_fermeture_prevue, opportunity.source, opportunity.statut]
                );

                importedCount++;

            } catch (error) {
                this.importStats.errors.push(`Opportunité ${oppData.Opportunité || oppData.opportunite}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${importedCount} opportunités importées`);
    }

    /**
     * Lire un fichier CSV
     */
    async readCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];

            fs.createReadStream(filePath)
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => {
                    results.push(data);
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    /**
     * Obtenir l'ID d'une division par son code
     */
    async getDivisionId(code) {
        const result = await query('SELECT id FROM divisions WHERE code = $1', [code]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }

    /**
     * Obtenir l'ID d'un utilisateur par ses initiales
     */
    async getUserId(initiales) {
        const result = await query('SELECT id FROM users WHERE initiales = $1', [initiales]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }

    /**
     * Obtenir l'ID d'un client par son nom
     */
    async getClientId(name) {
        const result = await query('SELECT id FROM clients WHERE raison_sociale = $1', [name]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }

    /**
     * Obtenir l'ID d'une mission par son code ou nom
     */
    async getMissionId(codeOrName) {
        const result = await query('SELECT id FROM missions WHERE code = $1 OR nom = $1', [codeOrName]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    }

    /**
     * Mapper un grade
     */
    mapGrade(grade) {
        const gradeMap = {
            'ASSISTANT': 'ASSISTANT',
            'SENIOR': 'SENIOR',
            'MANAGER': 'MANAGER',
            'DIRECTOR': 'DIRECTOR',
            'PARTNER': 'PARTNER'
        };
        return gradeMap[grade?.toUpperCase()] || 'ASSISTANT';
    }

    /**
     * Mapper un type d'heures
     */
    mapHourType(type) {
        const typeMap = {
            'NORMALES': 'NORMALES',
            'SUPPLEMENTAIRES': 'SUPPLEMENTAIRES',
            'NUIT': 'NUIT',
            'WEEKEND': 'WEEKEND',
            'FERIE': 'FERIE'
        };
        return typeMap[type?.toUpperCase()] || 'NORMALES';
    }

    /**
     * Mapper un statut de mission
     */
    mapMissionStatus(status) {
        const statusMap = {
            'EN_COURS': 'EN_COURS',
            'TERMINEE': 'TERMINEE',
            'ANNULEE': 'ANNULEE',
            'EN_ATTENTE': 'EN_ATTENTE'
        };
        return statusMap[status?.toUpperCase()] || 'EN_COURS';
    }

    /**
     * Mapper un statut de saisie de temps
     */
    mapTimeEntryStatus(status) {
        const statusMap = {
            'SAISIE': 'SAISIE',
            'VALIDEE': 'VALIDEE',
            'REJETEE': 'REJETEE',
            'FACTUREE': 'FACTUREE'
        };
        return statusMap[status?.toUpperCase()] || 'SAISIE';
    }

    /**
     * Mapper un statut de facture
     */
    mapInvoiceStatus(status) {
        const statusMap = {
            'BROUILLON': 'BROUILLON',
            'EMISE': 'EMISE',
            'ENVOYEE': 'ENVOYEE',
            'PAYEE': 'PAYEE',
            'EN_RETARD': 'EN_RETARD',
            'ANNULEE': 'ANNULEE'
        };
        return statusMap[status?.toUpperCase()] || 'EMISE';
    }

    /**
     * Mapper un statut d'opportunité
     */
    mapOpportunityStatus(status) {
        const statusMap = {
            'OUVERTE': 'OUVERTE',
            'GAGNEE': 'GAGNEE',
            'PERDUE': 'PERDUE',
            'FERMEE': 'FERMEE'
        };
        return statusMap[status?.toUpperCase()] || 'OUVERTE';
    }

    /**
     * Parser une date
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        // Formats de date courants
        const datePatterns = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
        ];

        for (const pattern of datePatterns) {
            const match = dateStr.match(pattern);
            if (match) {
                if (pattern.source.includes('YYYY')) {
                    // Format YYYY-MM-DD
                    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                } else {
                    // Format DD/MM/YYYY ou DD-MM-YYYY
                    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
                }
            }
        }

        return null;
    }

    /**
     * Générer un SIRET fictif
     */
    generateSiret() {
        return Math.random().toString().slice(2, 16);
    }

    /**
     * Générer un code de mission
     */
    generateMissionCode() {
        return `MISS-${Date.now().toString().slice(-6)}`;
    }

    /**
     * Générer un numéro de facture
     */
    generateInvoiceNumber() {
        return `FACT-${Date.now().toString().slice(-6)}`;
    }

    /**
     * Afficher les statistiques d'importation
     */
    printImportStats() {
        console.log('\n📊 STATISTIQUES D\'IMPORTATION');
        console.log('==============================');
        console.log(`📁 Fichiers traités: ${this.importStats.processedFiles}`);
        console.log(`📊 Lignes importées: ${this.importStats.importedRows}`);

        if (this.importStats.errors.length > 0) {
            console.log(`❌ Erreurs: ${this.importStats.errors.length}`);
            this.importStats.errors.slice(0, 5).forEach(error => {
                console.log(`   - ${error}`);
            });
        }

        if (this.importStats.warnings.length > 0) {
            console.log(`⚠️  Avertissements: ${this.importStats.warnings.length}`);
            this.importStats.warnings.slice(0, 5).forEach(warning => {
                console.log(`   - ${warning}`);
            });
        }
    }
}

module.exports = CSVImporter; 