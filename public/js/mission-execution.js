// mission-execution.js

let executionMissionId = null;
let treeData = [];

// Initialiser l'onglet Exécution
function initExecutionTab(id) {
    executionMissionId = id;
    loadMissionDocuments();
}

// Charger l'arborescence des documents
async function loadMissionDocuments() {
    const container = document.getElementById('documentTreeContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 text-muted">Chargement des documents...</p></div>';

    try {
        const response = await authenticatedFetch(`/api/mission-documents/${executionMissionId}/tree`);
        if (response.ok) {
            const result = await response.json();
            treeData = result.data;
            renderTree(treeData, container);
        } else {
            container.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des documents.</div>';
        }
    } catch (error) {
        console.error('Erreur chargement tree:', error);
        container.innerHTML = '<div class="alert alert-danger">Erreur de connexion.</div>';
    }
}

// Rendre l'arborescence
function renderTree(nodes, container) {
    container.innerHTML = '';

    if (nodes.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center py-5">
                <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                <p class="text-muted">Aucun document.</p>
                <button class="btn btn-sm btn-outline-primary" onclick="createNewNode(null, 'folder')">
                    <i class="fas fa-plus"></i> Créer un dossier racine
                </button>
            </div>`;
        return;
    }

    // Convertir la liste plate en arbre
    const tree = buildTree(nodes);
    const ul = document.createElement('ul');
    ul.className = 'tree-view list-unstyled';

    // Ajout d'un bouton racine si nécessaire
    // const rootBtn = document.createElement('li');
    // rootBtn.innerHTML = `<button class="btn btn-sm btn-link text-decoration-none" onclick="createNewNode(null, 'folder')"><i class="fas fa-plus"></i> Nouveau dossier racine</button>`;
    // ul.appendChild(rootBtn);

    tree.forEach(node => {
        ul.appendChild(createTreeNode(node));
    });

    container.appendChild(ul);
}

// Construire la structure hiérarchique à partir de la liste plate
function buildTree(flatList) {
    const map = {};
    const roots = [];

    // Initialiser chaque noeud
    flatList.forEach(node => {
        map[node.id] = { ...node, children: [] };
    });

    // Connecter les parents et enfants
    flatList.forEach(node => {
        if (node.parent_id && map[node.parent_id]) {
            map[node.parent_id].children.push(map[node.id]);
        } else {
            roots.push(map[node.id]);
        }
    });

    return roots;
}

// Créer un élément DOM pour un noeud
function createTreeNode(node) {
    const li = document.createElement('li');
    li.className = `tree-node ${node.type}`;
    li.dataset.id = node.id;

    const content = document.createElement('div');
    content.className = 'node-content d-flex align-items-center p-2 rounded';
    content.style.cursor = 'pointer';

    // Icone
    const icon = document.createElement('i');
    icon.className = node.type === 'folder' ? 'fas fa-folder text-warning me-2' : getFileIcon(node.mime_type) + ' me-2';

    // Nom
    const name = document.createElement('span');
    name.className = 'flex-grow-1 user-select-none';
    if (node.is_locked) {
        name.innerHTML = `${node.name} <i class="fas fa-lock text-muted ms-2" title="Dossier système protégé" style="font-size: 0.8em;"></i>`;
    } else {
        name.textContent = node.name;
    }

    // Actions (hover)
    const actions = document.createElement('div');
    actions.className = 'node-actions ms-auto d-none'; // Affiché via CSS hover

    if (node.type === 'folder') {
        const uploadBtn = createActionButton('fa-upload', 'Upload fichier', () => triggerUpload(node.id));
        const addFolderBtn = createActionButton('fa-folder-plus', 'Nouveau dossier', () => createNewNode(node.id, 'folder'));
        actions.appendChild(uploadBtn);
        actions.appendChild(addFolderBtn);
    }

    // Actions communes
    if (node.file_path) {
        const downloadBtn = document.createElement('a');
        downloadBtn.href = node.file_path;
        downloadBtn.target = '_blank';
        downloadBtn.className = 'btn btn-sm btn-link text-primary p-0 ms-2';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
        downloadBtn.title = 'Télécharger';
        actions.appendChild(downloadBtn);
    }

    if (!node.is_locked) {
        const renameBtn = createActionButton('fa-edit', 'Renommer', () => renameNode(node));
        const deleteBtn = createActionButton('fa-trash', 'Supprimer', () => deleteNode(node));

        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
    }

    content.appendChild(icon);
    content.appendChild(name);
    content.appendChild(actions);

    content.addEventListener('mouseenter', () => actions.classList.remove('d-none'));
    content.addEventListener('mouseleave', () => actions.classList.add('d-none'));

    if (node.type === 'folder') {
        content.addEventListener('click', (e) => {
            if (e.target.closest('.btn') || e.target.closest('a')) return;
            const childrenContainer = li.querySelector('ul');
            if (childrenContainer) {
                const isHidden = childrenContainer.style.display === 'none';
                childrenContainer.style.display = isHidden ? 'block' : 'none';
                icon.className = isHidden ? 'fas fa-folder-open text-warning me-2' : 'fas fa-folder text-warning me-2';
            }
        });

        // Drag & Drop
        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            content.classList.add('bg-light', 'border', 'border-primary');
        });
        content.addEventListener('dragleave', (e) => {
            e.preventDefault();
            content.classList.remove('bg-light', 'border', 'border-primary');
        });
        content.addEventListener('drop', (e) => {
            e.preventDefault();
            content.classList.remove('bg-light', 'border', 'border-primary');
            if (e.dataTransfer.files.length > 0) {
                handleFilesDrop(e.dataTransfer.files, node.id);
            }
        });
    }

    li.appendChild(content);

    // Enfants
    if (node.children && node.children.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'list-unstyled ms-4 border-start ps-2'; // Indentation
        node.children.forEach(child => {
            ul.appendChild(createTreeNode(child));
        });
        li.appendChild(ul);
    }

    return li;
}

function createActionButton(iconClass, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-link text-secondary p-0 ms-2';
    btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
    btn.title = title;
    btn.onclick = (e) => {
        e.stopPropagation();
        onClick();
    };
    return btn;
}

function getFileIcon(mimeType) {
    if (!mimeType) return 'fas fa-file text-secondary';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf text-danger';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word text-primary';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fas fa-file-excel text-success';
    if (mimeType.includes('image')) return 'fas fa-file-image text-info';
    return 'fas fa-file text-secondary';
}

// Actions
async function createNewNode(parentId, type) {
    const name = prompt(type === 'folder' ? 'Nom du nouveau dossier :' : 'Nom du fichier :');
    if (!name) return;

    try {
        const response = await authenticatedFetch('/api/mission-documents/node', {
            method: 'POST',
            body: JSON.stringify({
                mission_id: executionMissionId,
                parent_id: parentId,
                name: name,
                type: type
            })
        });

        if (response.ok) {
            loadMissionDocuments();
        } else {
            alert('Erreur lors de la création.');
        }
    } catch (error) {
        console.error(error);
        alert('Erreur de connexion.');
    }
}

async function renameNode(node) {
    const newName = prompt('Nouveau nom :', node.name);
    if (!newName || newName === node.name) return;

    try {
        const response = await authenticatedFetch(`/api/mission-documents/node/${node.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: newName,
                parent_id: node.parent_id
            })
        });

        if (response.ok) {
            loadMissionDocuments();
        } else {
            alert('Erreur lors du renommage.');
        }
    } catch (error) {
        console.error(error);
        alert('Erreur de connexion.');
    }
}

async function deleteNode(node) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${node.name}" ?`)) return;

    try {
        const response = await authenticatedFetch(`/api/mission-documents/node/${node.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadMissionDocuments();
        } else {
            alert('Erreur lors de la suppression.');
        }
    } catch (error) {
        console.error(error);
        alert('Erreur de connexion.');
    }
}

// Upload via bouton caché
function triggerUpload(parentId) {
    let input = document.getElementById('executionFileUpload');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'executionFileUpload';
        input.style.display = 'none';
        document.body.appendChild(input);
    }

    // Reset pour permettre de re-sélectionner le même fichier
    input.value = '';

    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            handleFilesDrop(e.target.files, parentId);
        }
    };

    input.click();
}

async function handleFilesDrop(files, parentId) {
    // Pour l'instant, one by one. Bulk upload possible mais plus complexe.
    for (const file of files) {
        await uploadSingleFile(file, parentId);
    }
    loadMissionDocuments();
}

async function uploadSingleFile(file, parentId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mission_id', executionMissionId);
    if (parentId) formData.append('parent_id', parentId);

    try {
        // IMPORTANT: Utiliser missionStep2Fetch ou une logique similaire sans Content-Type JSON forcé
        // Mais ici on est dans authenticatedFetch. Il faut s'assurer qu'il gère FormData.
        // Si auth.js est chargé, authenticatedFetch force json. 
        // IL FAUT UTILISER UNE VARIANTE ou corriger auth.js globalement (ce qu'on a évité avant).
        // Solution: Créer une fonction locale pour l'upload ici ou passer un flag.

        // On va utiliser fetch direct avec le token header manuel pour éviter le wrapper qui force JSON
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/mission-documents/node', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Pas de Content-Type -> browser met multipart boundary
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Upload error:', err);
            alert(`Erreur upload ${file.name}: ${err.error || 'Erreur inconnue'}`);
        }
    } catch (error) {
        console.error(error);
        alert(`Erreur connexion pour ${file.name}`);
    }
}
