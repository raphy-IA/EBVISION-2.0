const fs = require('fs');
const path = require('path');

console.log('🔧 Correction de l\'affichage des rôles multiples');
console.log('='.repeat(80));

const fixes = [];

// Fix 1: Modifier src/routes/auth.js pour retourner les rôles multiples
const authPath = path.join(__dirname, '../src/routes/auth.js');
let authContent = fs.readFileSync(authPath, 'utf8');

console.log('\n📝 Fix 1: src/routes/auth.js - Ajouter les rôles multiples dans /api/auth/me');

// Trouver et remplacer la section qui retourne les données utilisateur
const authOldPattern = /data: {\s+user: {\s+id: user\.id,\s+email: user\.email,\s+login: user\.login,\s+role: user\.role,/;
const authNewCode = `data: {
                user: {
                    id: user.id,
                    email: user.email,
                    login: user.login,
                    role: user.role, // Rôle legacy (pour compatibilité)`;

if (authContent.match(authOldPattern)) {
    // Ajouter la récupération des rôles multiples avant le return
    const meEndpointPattern = /(router\.get\('\/me'.*?async \(req, res\) => {[\s\S]*?const user = userResult\.rows\[0\];)/;
    
    if (authContent.match(meEndpointPattern)) {
        authContent = authContent.replace(
            meEndpointPattern,
            `$1
        
        // Récupérer tous les rôles de l'utilisateur
        const rolesResult = await client.query(\`
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        \`, [user.id]);
        
        const userRoles = rolesResult.rows.map(r => r.name);`
        );
        
        // Ajouter les rôles dans la réponse
        authContent = authContent.replace(
            /role: user\.role,\s+statut: user\.statut,\s+collaborateur_id: user\.collaborateur_id,/,
            `role: user.role, // Rôle legacy (pour compatibilité)
                    roles: userRoles, // Rôles multiples
                    statut: user.statut,
                    collaborateur_id: user.collaborateur_id,`
        );
        
        fs.writeFileSync(authPath, authContent, 'utf8');
        fixes.push('✅ src/routes/auth.js - Rôles multiples ajoutés dans /api/auth/me');
        console.log('   ✅ Rôles multiples ajoutés dans /api/auth/me');
    }
}

// Fix 2: Modifier public/js/profile-menu.js pour afficher les rôles multiples
const profilePath = path.join(__dirname, '../public/js/profile-menu.js');
let profileContent = fs.readFileSync(profilePath, 'utf8');

console.log('\n📝 Fix 2: public/js/profile-menu.js - Afficher les rôles multiples');

// Modifier getRoleName pour accepter un array de rôles
if (profileContent.includes('getRoleName(role)')) {
    profileContent = profileContent.replace(
        /getRoleName\(role\) {/,
        `getRoleName(role) {
        // Si c'est un array de rôles, retourner une chaîne formatée
        if (Array.isArray(role)) {
            if (role.length === 0) return 'Aucun rôle';
            if (role.length === 1) return this.getRoleName(role[0]);
            return role.map(r => this.getRoleName(r)).join(' + ');
        }`
    );
    
    // Modifier l'affichage du profil pour utiliser userData.roles si disponible
    profileContent = profileContent.replace(
        /profileRole: this\.getRoleName\(userData\.role\)/,
        `profileRole: this.getRoleName(userData.roles || userData.role)`
    );
    
    // Modifier le badge de rôle
    profileContent = profileContent.replace(
        /roleBadge\.textContent = this\.getRoleName\(userData\.role\);[\s\S]*?roleBadge\.className = this\.getRoleClass\(userData\.role\);/,
        `const roles = userData.roles || [userData.role];
            if (roles.length === 1) {
                roleBadge.textContent = this.getRoleName(roles[0]);
                roleBadge.className = this.getRoleClass(roles[0]);
            } else {
                roleBadge.textContent = \`\${roles.length} rôles\`;
                roleBadge.className = 'badge bg-info';
                roleBadge.title = roles.map(r => this.getRoleName(r)).join(', ');
            }`
    );
    
    fs.writeFileSync(profilePath, profileContent, 'utf8');
    fixes.push('✅ public/js/profile-menu.js - Affichage des rôles multiples ajouté');
    console.log('   ✅ Affichage des rôles multiples ajouté');
}

// Fix 3: Modifier public/js/user-header.js pour afficher les rôles multiples
const userHeaderPath = path.join(__dirname, '../public/js/user-header.js');
if (fs.existsSync(userHeaderPath)) {
    let userHeaderContent = fs.readFileSync(userHeaderPath, 'utf8');
    
    console.log('\n📝 Fix 3: public/js/user-header.js - Afficher les rôles multiples');
    
    // Chercher la section qui affiche le rôle
    if (userHeaderContent.includes('userData.role')) {
        userHeaderContent = userHeaderContent.replace(
            /userData\.role/g,
            `(userData.roles && userData.roles.length > 0 ? userData.roles.join(' + ') : userData.role)`
        );
        
        fs.writeFileSync(userHeaderPath, userHeaderContent, 'utf8');
        fixes.push('✅ public/js/user-header.js - Affichage des rôles multiples ajouté');
        console.log('   ✅ Affichage des rôles multiples ajouté');
    }
}

console.log('\n' + '='.repeat(80));
console.log(`✅ ${fixes.length} corrections appliquées`);
console.log('\n📋 Corrections effectuées:');
fixes.forEach(fix => console.log(`   ${fix}`));

console.log('\n💡 Prochaines étapes:');
console.log('   1. Testez en local: npm start');
console.log('   2. Vérifiez le profil et /users.html');
console.log('   3. Commitez: git add . && git commit -m "fix: Affichage des rôles multiples"');
console.log('   4. Pushez: git push origin main');
console.log('   5. Déployez en production');













