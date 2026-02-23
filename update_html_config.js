
const fs = require('fs');
const path = 'public/objectives-config.html';
let content = fs.readFileSync(path, 'utf8');

// Metric Modal
const metricTarget = `<textarea class="form-control" id="metricDescription" rows="2"></textarea>
                        </div>`;
const metricReplacement = `<textarea class="form-control" id="metricDescription" rows="2"></textarea>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="metricIsActive" checked>
                            <label class="form-check-label" for="metricIsActive">Métrique active</label>
                        </div>`;

// Type Modal
const typeTarget = `<textarea class="form-control" id="typeDescription" rows="2"
                                placeholder="Description du type d'objectif..."></textarea>
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> <strong>Note:</strong> Les types avec une unité de
                                type "Devise" seront automatiquement marqués comme financiers.
                            </small>
                        </div>`;
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

// Unit Modal
const unitTarget = `<select class="form-select" id="unitType" required>
                                    <option value="CURRENCY">Devise</option>
                                    <option value="PERCENTAGE">Pourcentage</option>
                                    <option value="COUNT">Nombre</option>
                                    <option value="DURATION">Durée</option>
                                    <option value="OTHER">Autre</option>
                                </select>
                            </div>
                        </div>`;
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

content = content.replace(metricTarget, metricReplacement);
content = content.replace(typeTarget, typeReplacement);
content = content.replace(unitTarget, unitReplacement);

fs.writeFileSync(path, content);
console.log('HTML updated successfully');
