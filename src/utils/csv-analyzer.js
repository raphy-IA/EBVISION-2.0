const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Utilitaire pour analyser les fichiers CSV existants
 */
class CSVAnalyzer {
    constructor() {
        this.csvFiles = [
            'données_TRS.csv',
            'liste des factures.csv',
            'liste des opportunités.csv',
            'liste des missions.csv',
            'initiales.csv',
            'Taux horaire par grade.csv'
        ];
    }

    /**
     * Analyser un fichier CSV et retourner sa structure
     */
    async analyzeCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            const columns = new Set();
            let rowCount = 0;

            if (!fs.existsSync(filePath)) {
                resolve({
                    file: path.basename(filePath),
                    exists: false,
                    error: 'Fichier non trouvé'
                });
                return;
            }

            fs.createReadStream(filePath)
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => {
                    rowCount++;
                    results.push(data);
                    
                    // Collecter les colonnes
                    Object.keys(data).forEach(key => columns.add(key));
                })
                .on('end', () => {
                    // Analyser les types de données
                    const sampleData = results.slice(0, 10);
                    const columnTypes = this.analyzeColumnTypes(sampleData);
                    
                    resolve({
                        file: path.basename(filePath),
                        exists: true,
                        rowCount,
                        columns: Array.from(columns),
                        columnTypes,
                        sampleData: results.slice(0, 3),
                        analysis: this.analyzeContent(results)
                    });
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    /**
     * Analyser les types de colonnes
     */
    analyzeColumnTypes(sampleData) {
        if (sampleData.length === 0) return {};

        const columnTypes = {};
        const columns = Object.keys(sampleData[0]);

        columns.forEach(column => {
            const values = sampleData.map(row => row[column]).filter(val => val !== undefined && val !== '');
            
            if (values.length === 0) {
                columnTypes[column] = 'unknown';
                return;
            }

            // Analyser le type
            const firstValue = values[0];
            
            // Vérifier si c'est une date
            if (this.isDate(firstValue)) {
                columnTypes[column] = 'date';
            }
            // Vérifier si c'est un nombre
            else if (this.isNumber(firstValue)) {
                columnTypes[column] = 'number';
            }
            // Vérifier si c'est un email
            else if (this.isEmail(firstValue)) {
                columnTypes[column] = 'email';
            }
            // Sinon c'est du texte
            else {
                columnTypes[column] = 'text';
            }
        });

        return columnTypes;
    }

    /**
     * Analyser le contenu des données
     */
    analyzeContent(data) {
        if (data.length === 0) return {};

        const analysis = {};
        const columns = Object.keys(data[0]);

        columns.forEach(column => {
            const values = data.map(row => row[column]).filter(val => val !== undefined && val !== '');
            
            analysis[column] = {
                totalValues: values.length,
                uniqueValues: new Set(values).size,
                nullValues: data.length - values.length,
                sampleValues: [...new Set(values)].slice(0, 5)
            };
        });

        return analysis;
    }

    /**
     * Vérifier si une valeur est une date
     */
    isDate(value) {
        if (!value || typeof value !== 'string') return false;
        
        // Formats de date courants
        const datePatterns = [
            /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
            /^\d{4}-\d{1,2}-\d{1,2}$/,   // YYYY-MM-DD
            /^\d{1,2}-\d{1,2}-\d{4}$/,   // DD-MM-YYYY
            /^\d{1,2}\/\d{1,2}\/\d{2}$/, // DD/MM/YY
        ];

        return datePatterns.some(pattern => pattern.test(value));
    }

    /**
     * Vérifier si une valeur est un nombre
     */
    isNumber(value) {
        if (!value || typeof value !== 'string') return false;
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Vérifier si une valeur est un email
     */
    isEmail(value) {
        if (!value || typeof value !== 'string') return false;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(value);
    }

    /**
     * Analyser tous les fichiers CSV
     */
    async analyzeAllFiles() {
        console.log('🔍 ANALYSE DES FICHIERS CSV EXISTANTS\n');

        const analyses = [];

        for (const fileName of this.csvFiles) {
            const filePath = path.join(process.cwd(), fileName);
            console.log(`📊 Analyse de ${fileName}...`);
            
            try {
                const analysis = await this.analyzeCSV(filePath);
                analyses.push(analysis);
                
                if (analysis.exists) {
                    console.log(`   ✅ ${analysis.rowCount} lignes, ${analysis.columns.length} colonnes`);
                } else {
                    console.log(`   ❌ ${analysis.error}`);
                }
            } catch (error) {
                console.log(`   ❌ Erreur: ${error.message}`);
                analyses.push({
                    file: fileName,
                    exists: false,
                    error: error.message
                });
            }
        }

        return analyses;
    }

    /**
     * Générer un rapport d'analyse
     */
    generateReport(analyses) {
        const report = {
            summary: {
                totalFiles: analyses.length,
                existingFiles: analyses.filter(a => a.exists).length,
                totalRows: analyses.filter(a => a.exists).reduce((sum, a) => sum + a.rowCount, 0)
            },
            files: analyses,
            recommendations: this.generateRecommendations(analyses)
        };

        return report;
    }

    /**
     * Générer des recommandations d'importation
     */
    generateRecommendations(analyses) {
        const recommendations = [];

        // Analyser les correspondances avec notre schéma
        const existingFiles = analyses.filter(a => a.exists);
        
        existingFiles.forEach(analysis => {
            const fileName = analysis.file;
            
            if (fileName.includes('TRS') || fileName.includes('données')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'time_entries',
                    mapping: this.mapTRSColumns(analysis.columns),
                    priority: 'high'
                });
            }
            
            if (fileName.includes('factures')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'invoices',
                    mapping: this.mapInvoiceColumns(analysis.columns),
                    priority: 'high'
                });
            }
            
            if (fileName.includes('missions')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'missions',
                    mapping: this.mapMissionColumns(analysis.columns),
                    priority: 'high'
                });
            }
            
            if (fileName.includes('opportunités')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'opportunities',
                    mapping: this.mapOpportunityColumns(analysis.columns),
                    priority: 'medium'
                });
            }
            
            if (fileName.includes('initiales')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'users',
                    mapping: this.mapUserColumns(analysis.columns),
                    priority: 'high'
                });
            }
            
            if (fileName.includes('Taux horaire')) {
                recommendations.push({
                    file: fileName,
                    targetTable: 'hourly_rates',
                    mapping: this.mapRateColumns(analysis.columns),
                    priority: 'medium'
                });
            }
        });

        return recommendations;
    }

    /**
     * Mapping des colonnes TRS
     */
    mapTRSColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('nom') || lowerCol.includes('name')) {
                mapping[col] = 'user_name';
            } else if (lowerCol.includes('initiales')) {
                mapping[col] = 'user_initials';
            } else if (lowerCol.includes('division')) {
                mapping[col] = 'division';
            } else if (lowerCol.includes('grade')) {
                mapping[col] = 'grade';
            } else if (lowerCol.includes('mission') || lowerCol.includes('code mission')) {
                mapping[col] = 'mission_code';
            } else if (lowerCol.includes('missions')) {
                mapping[col] = 'mission_description';
            } else if (lowerCol.includes('heures') || lowerCol.includes('hours')) {
                mapping[col] = 'hours';
            } else if (lowerCol.includes('perdiem')) {
                mapping[col] = 'perdiem';
            } else if (lowerCol.includes('transport')) {
                mapping[col] = 'transport';
            } else if (lowerCol.includes('hotel')) {
                mapping[col] = 'hotel';
            } else if (lowerCol.includes('restaurant')) {
                mapping[col] = 'restaurant';
            } else if (lowerCol.includes('divers')) {
                mapping[col] = 'miscellaneous';
            } else if (lowerCol.includes('type heure')) {
                mapping[col] = 'hour_type';
            } else if (lowerCol.includes('mois') || lowerCol.includes('date')) {
                mapping[col] = 'date';
            } else if (lowerCol.includes('statut')) {
                mapping[col] = 'status';
            }
        });

        return mapping;
    }

    /**
     * Mapping des colonnes Factures
     */
    mapInvoiceColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('numéro') || lowerCol.includes('numero')) {
                mapping[col] = 'invoice_number';
            } else if (lowerCol.includes('client')) {
                mapping[col] = 'client_name';
            } else if (lowerCol.includes('montant') || lowerCol.includes('amount')) {
                mapping[col] = 'amount';
            } else if (lowerCol.includes('date')) {
                mapping[col] = 'date';
            } else if (lowerCol.includes('statut')) {
                mapping[col] = 'status';
            }
        });

        return mapping;
    }

    /**
     * Mapping des colonnes Missions
     */
    mapMissionColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('code') || lowerCol.includes('mission')) {
                mapping[col] = 'mission_code';
            } else if (lowerCol.includes('description') || lowerCol.includes('nom')) {
                mapping[col] = 'description';
            } else if (lowerCol.includes('client')) {
                mapping[col] = 'client_name';
            } else if (lowerCol.includes('date')) {
                mapping[col] = 'date';
            } else if (lowerCol.includes('statut')) {
                mapping[col] = 'status';
            }
        });

        return mapping;
    }

    /**
     * Mapping des colonnes Opportunités
     */
    mapOpportunityColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('opportunité') || lowerCol.includes('opportunite')) {
                mapping[col] = 'opportunity_name';
            } else if (lowerCol.includes('client')) {
                mapping[col] = 'client_name';
            } else if (lowerCol.includes('montant') || lowerCol.includes('amount')) {
                mapping[col] = 'amount';
            } else if (lowerCol.includes('date')) {
                mapping[col] = 'date';
            } else if (lowerCol.includes('statut')) {
                mapping[col] = 'status';
            }
        });

        return mapping;
    }

    /**
     * Mapping des colonnes Utilisateurs
     */
    mapUserColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('nom')) {
                mapping[col] = 'last_name';
            } else if (lowerCol.includes('prénom') || lowerCol.includes('prenom')) {
                mapping[col] = 'first_name';
            } else if (lowerCol.includes('initiales')) {
                mapping[col] = 'initials';
            } else if (lowerCol.includes('email')) {
                mapping[col] = 'email';
            } else if (lowerCol.includes('grade')) {
                mapping[col] = 'grade';
            } else if (lowerCol.includes('division')) {
                mapping[col] = 'division';
            }
        });

        return mapping;
    }

    /**
     * Mapping des colonnes Taux horaires
     */
    mapRateColumns(columns) {
        const mapping = {};
        
        columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            
            if (lowerCol.includes('grade')) {
                mapping[col] = 'grade';
            } else if (lowerCol.includes('taux') || lowerCol.includes('rate')) {
                mapping[col] = 'hourly_rate';
            } else if (lowerCol.includes('date')) {
                mapping[col] = 'effective_date';
            }
        });

        return mapping;
    }
}

module.exports = CSVAnalyzer; 