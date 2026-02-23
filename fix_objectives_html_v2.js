
const fs = require('fs');
const path = 'public/objectives-config.html';
let content = fs.readFileSync(path, 'utf8');

// Metric Modal Injection
if (!content.includes('id="metricIsActive"')) {
    const metricRegex = /<textarea class="form-control" id="metricDescription" rows="2"><\/textarea>\s+<\/div>/;
    const metricReplacement = `<textarea class="form-control" id="metricDescription" rows="2"></textarea>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="metricIsActive" checked>
                            <label class="form-check-label" for="metricIsActive">Métrique active</label>
                        </div>`;
    content = content.replace(metricRegex, metricReplacement);
}

// Type Modal Injection
if (!content.includes('id="typeIsActive"')) {
    const typeRegex = /<textarea class="form-control" id="typeDescription" rows="2"\s+placeholder="Description du type d'objectif..."><\/textarea>\s+<small class="text-muted">[\s\S]+?<\/small>\s+<\/div>/;
    const typeReplacement = `<textarea class="form-control" id="typeDescription" rows="2"
                                placeholder="Description du type d'objectif..."></textarea>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="typeIsActive" checked>
                            <label class="form-check-label" for="typeIsActive">Type d'objectif actif</label>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> <strong>Note:</strong> Les types avec une unité de
                                type "Devise" seront automatiquement marqués comme financiers.
                            </small>
                        </div>`;
    content = content.replace(typeRegex, typeReplacement);
}

// Unit Modal Injection
if (!content.includes('id="unitIsActive"')) {
    const unitRegex = /<select class="form-select" id="unitType" required>[\s\S]+?<\/select>\s+<\/div>\s+<\/div>/;
    const unitReplacement = `<select class="form-select" id="unitType" required>
                                    <option value="CURRENCY">Devise</option>
                                    <option value="PERCENTAGE">Pourcentage</option>
                                    <option value="COUNT">Nombre</option>
                                    <option value="DURATION">Durée</option>
                                    <option value="OTHER">Autre</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="unitIsActive" checked>
                            <label class="form-check-label" for="unitIsActive">Unité active</label>
                        </div>`;
    content = content.replace(unitRegex, unitReplacement);
}

fs.writeFileSync(path, content);
console.log('HTML fixed successfully with Regex');
