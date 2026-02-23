
const fs = require('fs');
const path = 'public/objectives-config.html';
let content = fs.readFileSync(path, 'utf8');

// Fix headers (removing literal \n)
content = content.replace('<th>Sources</th>\\n                                                        <th>Statut</th>',
    '<th>Sources</th>\n                                                        <th>Statut</th>');
content = content.replace('<th>Configuration</th>\\n                                                        <th>Statut</th>',
    '<th>Configuration</th>\n                                                        <th>Statut</th>');
content = content.replace('<th>Type</th>\\n                                                        <th>Statut</th>',
    '<th>Type</th>\n                                                        <th>Statut</th>');

// Inject checkboxes (safely using unique anchor tags)

// Metric Modal
if (!content.includes('id="metricIsActive"')) {
    const metricAnchor = '<textarea class="form-control" id="metricDescription" rows="2"></textarea>\n                        </div>';
    const metricReplacement = '<textarea class="form-control" id="metricDescription" rows="2"></textarea>\n                        </div>\n                        <div class="mb-3 form-check">\n                            <input type="checkbox" class="form-check-input" id="metricIsActive" checked>\n                            <label class="form-check-label" for="metricIsActive">Métrique active</label>\n                        </div>';
    content = content.replace(metricAnchor, metricReplacement);
}

// Type Modal
if (!content.includes('id="typeIsActive"')) {
    const typeAnchor = '<textarea class="form-control" id="typeDescription" rows="2"\n                                placeholder="Description du type d\'objectif..."></textarea>\n                            <small class="text-muted">\n                                <i class="fas fa-info-circle"></i> <strong>Note:</strong> Les types avec une unité de\n                                type "Devise" seront automatiquement marqués comme financiers.\n                            </small>\n                        </div>';
    const typeReplacement = '<textarea class="form-control" id="typeDescription" rows="2"\n                                placeholder="Description du type d\'objectif..."></textarea>\n                        </div>\n                        <div class="mb-3 form-check">\n                            <input type="checkbox" class="form-check-input" id="typeIsActive" checked>\n                            <label class="form-check-label" for="typeIsActive">Type d\'objectif actif</label>\n                        </div>\n                        <div class="mb-3">\n                            <small class="text-muted">\n                                <i class="fas fa-info-circle"></i> <strong>Note:</strong> Les types avec une unité de\n                                type "Devise" seront automatiquement marqués comme financiers.\n                            </small>\n                        </div>';
    content = content.replace(typeAnchor, typeReplacement);
}

// Unit Modal
if (!content.includes('id="unitIsActive"')) {
    const unitAnchor = '<select class="form-select" id="unitType" required>\n                                    <option value="CURRENCY">Devise</option>\n                                    <option value="PERCENTAGE">Pourcentage</option>\n                                    <option value="COUNT">Nombre</option>\n                                    <option value="DURATION">Durée</option>\n                                    <option value="OTHER">Autre</option>\n                                </select>\n                            </div>\n                        </div>';
    const unitReplacement = '<select class="form-select" id="unitType" required>\n                                    <option value="CURRENCY">Devise</option>\n                                    <option value="PERCENTAGE">Pourcentage</option>\n                                    <option value="COUNT">Nombre</option>\n                                    <option value="DURATION">Durée</option>\n                                    <option value="OTHER">Autre</option>\n                                </select>\n                            </div>\n                        </div>\n                        <div class="mb-3 form-check">\n                            <input type="checkbox" class="form-check-input" id="unitIsActive" checked>\n                            <label class="form-check-label" for="unitIsActive">Unité active</label>\n                        </div>';
    content = content.replace(unitAnchor, unitReplacement);
}

fs.writeFileSync(path, content);
console.log('HTML fixed successfully');
