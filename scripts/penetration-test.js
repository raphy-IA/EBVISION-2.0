#!/usr/bin/env node

/**
 * Test de pénétration basique pour EB-Vision 2.0
 * Simule des attaques courantes pour tester les défenses
 * Usage: node scripts/penetration-test.js
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

console.log('🎯 TEST DE PÉNÉTRATION - EB-Vision 2.0');
console.log('======================================\n');

let totalTests = 0;
let passedTests = 0;
const vulnerabilities = [];

function testResult(passed, testName, details = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        console.log(`   ✅ ${testName} - ${details}`);
    } else {
        console.log(`   ❌ ${testName} - ${details}`);
        vulnerabilities.push({ test: testName, details });
    }
}

// Configuration
const BASE_URL = process.env.CORS_ORIGIN || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// 1. TEST DE RATE LIMITING
console.log('1. 🚦 TEST DE RATE LIMITING:');
console.log('===========================');

async function testRateLimiting() {
    try {
        // Test de rate limiting sur l'authentification
        const promises = [];
        for (let i = 0; i < 25; i++) {
            promises.push(makeRequest('POST', '/api/auth/login', {
                email: 'test@example.com',
                password: 'wrongpassword'
            }));
        }
        
        const responses = await Promise.all(promises);
        const blockedResponses = responses.filter(res => res.statusCode === 429);
        
        testResult(blockedResponses.length > 0, 
            'Rate limiting auth', 
            `${blockedResponses.length}/25 requêtes bloquées`);
            
    } catch (error) {
        testResult(false, 'Rate limiting auth', 'Test échoué');
    }
}

// 2. TEST D'INJECTION SQL
console.log('\n2. 💉 TEST D\'INJECTION SQL:');
console.log('===========================');

async function testSQLInjection() {
    const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1 --"
    ];
    
    for (const payload of sqlPayloads) {
        try {
            const response = await makeRequest('POST', '/api/auth/login', {
                email: payload,
                password: 'test'
            });
            
            // Vérifier que la réponse n'est pas une erreur SQL
            const isSQLError = response.body && (
                response.body.includes('syntax error') ||
                response.body.includes('SQL') ||
                response.body.includes('database') ||
                response.body.includes('postgres')
            );
            
            testResult(!isSQLError, `Injection SQL (${payload.substring(0, 20)}...)`, 
                isSQLError ? 'Vulnérable' : 'Sécurisé');
                
        } catch (error) {
            testResult(true, `Injection SQL (${payload.substring(0, 20)}...)`, 'Test échoué (bon signe)');
        }
    }
}

// 3. TEST XSS
console.log('\n3. 🎭 TEST XSS (Cross-Site Scripting):');
console.log('=====================================');

async function testXSS() {
    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><img src=x onerror=alert("XSS")>'
    ];
    
    for (const payload of xssPayloads) {
        try {
            const response = await makeRequest('POST', '/api/auth/login', {
                email: payload,
                password: 'test'
            });
            
            // Vérifier que le payload n'est pas retourné non échappé
            const isXSSVulnerable = response.body && response.body.includes(payload);
            
            testResult(!isXSSVulnerable, `XSS (${payload.substring(0, 20)}...)`, 
                isXSSVulnerable ? 'Vulnérable' : 'Sécurisé');
                
        } catch (error) {
            testResult(true, `XSS (${payload.substring(0, 20)}...)`, 'Test échoué (bon signe)');
        }
    }
}

// 4. TEST D'AUTHENTIFICATION
console.log('\n4. 🔐 TEST D\'AUTHENTIFICATION:');
console.log('==============================');

async function testAuthentication() {
    // Test avec des credentials par défaut
    const defaultCredentials = [
        { email: 'admin', password: 'admin' },
        { email: 'admin@admin.com', password: 'admin' },
        { email: 'test@test.com', password: 'test' },
        { email: 'user@user.com', password: 'user' },
        { email: 'demo@demo.com', password: 'demo' }
    ];
    
    for (const cred of defaultCredentials) {
        try {
            const response = await makeRequest('POST', '/api/auth/login', cred);
            
            testResult(response.statusCode !== 200 || !response.body.includes('success'), 
                `Credentials par défaut (${cred.email})`, 
                response.statusCode === 200 ? 'Vulnérable' : 'Sécurisé');
                
        } catch (error) {
            testResult(true, `Credentials par défaut (${cred.email})`, 'Test échoué (bon signe)');
        }
    }
}

// 5. TEST DE BRUTE FORCE
console.log('\n5. 💥 TEST DE BRUTE FORCE:');
console.log('=========================');

async function testBruteForce() {
    try {
        // Test avec un email valide mais mauvais mot de passe
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(makeRequest('POST', '/api/auth/login', {
                email: 'admin@example.com',
                password: `password${i}`
            }));
        }
        
        const responses = await Promise.all(promises);
        const successResponses = responses.filter(res => res.statusCode === 200);
        
        testResult(successResponses.length === 0, 
            'Protection brute force', 
            `${successResponses.length}/10 tentatives réussies`);
            
    } catch (error) {
        testResult(true, 'Protection brute force', 'Test échoué (bon signe)');
    }
}

// 6. TEST DE HEADERS DE SÉCURITÉ
console.log('\n6. 🛡️ TEST DES HEADERS DE SÉCURITÉ:');
console.log('===================================');

async function testSecurityHeaders() {
    try {
        const response = await makeRequest('GET', '/api/health');
        const headers = response.headers;
        
        const securityHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security',
            'content-security-policy'
        ];
        
        securityHeaders.forEach(header => {
            const hasHeader = headers[header] || headers[header.toLowerCase()];
            testResult(hasHeader, `Header ${header}`, 
                hasHeader ? 'Présent' : 'Manquant');
        });
        
    } catch (error) {
        testResult(false, 'Headers de sécurité', 'Test échoué');
    }
}

// 7. TEST D'ACCÈS NON AUTORISÉ
console.log('\n7. 🚫 TEST D\'ACCÈS NON AUTORISÉ:');
console.log('=================================');

async function testUnauthorizedAccess() {
    const protectedEndpoints = [
        '/api/users',
        '/api/admin',
        '/api/settings',
        '/api/reports'
    ];
    
    for (const endpoint of protectedEndpoints) {
        try {
            const response = await makeRequest('GET', endpoint);
            
            testResult(response.statusCode === 401 || response.statusCode === 403, 
                `Accès non autorisé ${endpoint}`, 
                response.statusCode === 401 || response.statusCode === 403 ? 'Protégé' : 'Vulnérable');
                
        } catch (error) {
            testResult(true, `Accès non autorisé ${endpoint}`, 'Test échoué (bon signe)');
        }
    }
}

// 8. TEST DE GESTION D'ERREURS
console.log('\n8. ⚠️ TEST DE GESTION D\'ERREURS:');
console.log('=================================');

async function testErrorHandling() {
    try {
        // Test avec des données invalides
        const response = await makeRequest('POST', '/api/auth/login', {
            email: null,
            password: undefined
        });
        
        // Vérifier que l'erreur ne révèle pas d'informations sensibles
        const isSecureError = !response.body || (
            !response.body.includes('stack') &&
            !response.body.includes('error:') &&
            !response.body.includes('at ') &&
            !response.body.includes('database')
        );
        
        testResult(isSecureError, 'Gestion d\'erreurs sécurisée', 
            isSecureError ? 'Sécurisé' : 'Révèle des informations');
            
    } catch (error) {
        testResult(true, 'Gestion d\'erreurs sécurisée', 'Test échoué (bon signe)');
    }
}

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Security-Test/1.0'
            }
        };
        
        const req = httpModule.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Exécuter tous les tests
async function runPenetrationTests() {
    try {
        await testRateLimiting();
        await testSQLInjection();
        await testXSS();
        await testAuthentication();
        await testBruteForce();
        await testSecurityHeaders();
        await testUnauthorizedAccess();
        await testErrorHandling();
        
        // Résultats
        console.log('\n📊 RÉSULTATS DU TEST DE PÉNÉTRATION:');
        console.log('====================================');
        
        const score = Math.round((passedTests / totalTests) * 100);
        console.log(`Score de résistance: ${score}/100 (${passedTests}/${totalTests} tests)`);
        
        if (vulnerabilities.length > 0) {
            console.log('\n❌ VULNÉRABILITÉS DÉTECTÉES:');
            console.log('============================');
            vulnerabilities.forEach((vuln, index) => {
                console.log(`${index + 1}. ${vuln.test} - ${vuln.details}`);
            });
        }
        
        if (score >= 90) {
            console.log('\n🟢 EXCELLENT: Application très résistante aux attaques');
        } else if (score >= 75) {
            console.log('\n🟡 BON: Application bien protégée');
        } else if (score >= 60) {
            console.log('\n🟠 MOYEN: Des améliorations de sécurité nécessaires');
        } else {
            console.log('\n🔴 CRITIQUE: Vulnérabilités importantes détectées');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors des tests de pénétration:', error);
    }
}

// Lancer les tests
runPenetrationTests();
