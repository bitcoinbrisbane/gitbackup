const { ipcRenderer } = require('electron');

// DOM Elements
const authSection = document.getElementById('auth-section');
const backupSection = document.getElementById('backup-section');
const restoreSection = document.getElementById('restore-section');
const authStatus = document.getElementById('auth-status');
const authMessage = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-btn');
const tokenInput = document.getElementById('token-input');
const authBtn = document.getElementById('auth-btn');
const repoSelect = document.getElementById('repo-select');
const refreshReposBtn = document.getElementById('refresh-repos-btn');
const createRepoBtn = document.getElementById('create-repo-btn');
const createRepoForm = document.getElementById('create-repo-form');
const newRepoName = document.getElementById('new-repo-name');
const newRepoPrivate = document.getElementById('new-repo-private');
const createRepoSubmit = document.getElementById('create-repo-submit');
const createRepoCancel = document.getElementById('create-repo-cancel');
const selectFilesBtn = document.getElementById('select-files-btn');
const selectFoldersBtn = document.getElementById('select-folders-btn');
const filesList = document.getElementById('files-list');
const backupPath = document.getElementById('backup-path');
const backupBtn = document.getElementById('backup-btn');
const backupProgress = document.getElementById('backup-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const backupResult = document.getElementById('backup-result');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabs = document.querySelector('.tabs');

// Restore elements
const restoreRepoSelect = document.getElementById('restore-repo-select');
const refreshRestoreReposBtn = document.getElementById('refresh-restore-repos-btn');
const restorePath = document.getElementById('restore-path');
const listFilesBtn = document.getElementById('list-files-btn');
const restoreFilesList = document.getElementById('restore-files-list');
const restoreLocationGroup = document.getElementById('restore-location-group');
const restoreLocation = document.getElementById('restore-location');
const selectFolderBtn = document.getElementById('select-folder-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreProgress = document.getElementById('restore-progress');
const restoreProgressFill = document.getElementById('restore-progress-fill');
const restoreProgressText = document.getElementById('restore-progress-text');
const restoreResult = document.getElementById('restore-result');

// State
let selectedFiles = [];
let selectedFolders = [];
let selectedRestoreFiles = [];
let currentRepo = '';

// Initialize
async function init() {
  const result = await ipcRenderer.invoke('get-token');
  if (result.token) {
    setAuthenticated(result.user);
  }
}

// Authentication
authBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    showError('Please enter a GitHub token');
    return;
  }

  authBtn.disabled = true;
  authBtn.textContent = 'Authenticating...';

  const result = await ipcRenderer.invoke('save-token', token);

  if (result.success) {
    setAuthenticated(result.user);
    tokenInput.value = '';
  } else {
    showError('Authentication failed: ' + result.error);
    authBtn.disabled = false;
    authBtn.textContent = 'Authenticate';
  }
});

logoutBtn.addEventListener('click', async () => {
  await ipcRenderer.invoke('clear-token');
  setUnauthenticated();
});

function setAuthenticated(username) {
  authMessage.textContent = `Authenticated as ${username}`;
  authStatus.classList.add('authenticated');
  logoutBtn.style.display = 'inline-block';
  document.getElementById('auth-form').style.display = 'none';
  backupSection.style.display = 'block';
  restoreSection.style.display = 'block';
  tabs.style.display = 'flex';
  loadRepositories();
}

function setUnauthenticated() {
  authMessage.textContent = 'Not authenticated';
  authStatus.classList.remove('authenticated');
  logoutBtn.style.display = 'none';
  document.getElementById('auth-form').style.display = 'flex';
  backupSection.style.display = 'none';
  restoreSection.style.display = 'none';
  tabs.style.display = 'none';
}

// Load repositories
async function loadRepositories() {
  repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
  restoreRepoSelect.innerHTML = '<option value="">Loading repositories...</option>';

  const result = await ipcRenderer.invoke('list-repos');

  if (result.success) {
    if (result.repos.length === 0) {
      repoSelect.innerHTML = '<option value="">No repositories found</option>';
      restoreRepoSelect.innerHTML = '<option value="">No repositories found</option>';
    } else {
      repoSelect.innerHTML = '<option value="">Select a repository...</option>';
      restoreRepoSelect.innerHTML = '<option value="">Select a repository...</option>';
      
      result.repos.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo.fullName;
        option.textContent = `${repo.name} ${repo.private ? '🔒' : ''}`;
        repoSelect.appendChild(option);

        const option2 = document.createElement('option');
        option2.value = repo.fullName;
        option2.textContent = `${repo.name} ${repo.private ? '🔒' : ''}`;
        restoreRepoSelect.appendChild(option2);
      });
    }
  } else {
    repoSelect.innerHTML = '<option value="">Error loading repositories</option>';
    restoreRepoSelect.innerHTML = '<option value="">Error loading repositories</option>';
    showError('Failed to load repositories: ' + result.error);
  }
}

refreshReposBtn.addEventListener('click', loadRepositories);
refreshRestoreReposBtn.addEventListener('click', loadRepositories);

// Create repository
createRepoBtn.addEventListener('click', () => {
  createRepoForm.style.display = 'flex';
  createRepoBtn.style.display = 'none';
});

createRepoCancel.addEventListener('click', () => {
  createRepoForm.style.display = 'none';
  createRepoBtn.style.display = 'inline-block';
  newRepoName.value = '';
});

createRepoSubmit.addEventListener('click', async () => {
  const repoName = newRepoName.value.trim();
  if (!repoName) {
    showError('Please enter a repository name');
    return;
  }

  createRepoSubmit.disabled = true;
  createRepoSubmit.textContent = 'Creating...';

  const result = await ipcRenderer.invoke('create-repo', repoName, newRepoPrivate.checked);

  if (result.success) {
    showSuccess('Repository created successfully!');
    createRepoForm.style.display = 'none';
    createRepoBtn.style.display = 'inline-block';
    newRepoName.value = '';
    await loadRepositories();
    repoSelect.value = result.repo.fullName;
  } else {
    showError('Failed to create repository: ' + result.error);
  }

  createRepoSubmit.disabled = false;
  createRepoSubmit.textContent = 'Create';
});

// File selection
selectFilesBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-files');

  if (!result.canceled) {
    selectedFiles = [...selectedFiles, ...result.files];
    renderFilesList();
    backupBtn.style.display = 'block';
  }
});

// Folder selection
selectFoldersBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folders');

  if (!result.canceled) {
    selectFoldersBtn.disabled = true;
    selectFoldersBtn.textContent = 'Loading folders...';

    const folderContents = await ipcRenderer.invoke('get-folder-contents', result.folders);

    if (folderContents.success) {
      selectedFolders = [...selectedFolders, ...folderContents.folders];
      renderFilesList();
      backupBtn.style.display = 'block';
    } else {
      showError('Failed to read folders: ' + folderContents.error);
    }

    selectFoldersBtn.disabled = false;
    selectFoldersBtn.textContent = '📁 Select Folders to Backup';
  }
});

function renderFilesList() {
  if (selectedFiles.length === 0 && selectedFolders.length === 0) {
    filesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>No files or folders selected</p></div>';
    backupBtn.style.display = 'none';
    return;
  }

  let html = '';

  // Render folders
  selectedFolders.forEach((folder, folderIndex) => {
    const totalSize = folder.files.reduce((sum, file) => sum + file.size, 0);
    html += `
      <div class="folder-item">
        <div class="folder-header">
          <div class="folder-info">
            <div class="folder-name">📁 ${escapeHtml(folder.name)}</div>
            <div class="folder-details">${folder.fileCount} files - ${formatSize(totalSize)} - ${escapeHtml(folder.path)}</div>
          </div>
          <button class="remove-file-btn" onclick="removeFolder(${folderIndex})">Remove</button>
        </div>
      </div>
    `;
  });

  // Render individual files
  selectedFiles.forEach((file, index) => {
    html += `
      <div class="file-item">
        <div class="file-info">
          <div class="file-name">📄 ${escapeHtml(file.name)}</div>
          <div class="file-details">${formatSize(file.size)} - ${escapeHtml(file.path)}</div>
        </div>
        <button class="remove-file-btn" onclick="removeFile(${index})">Remove</button>
      </div>
    `;
  });

  filesList.innerHTML = html;
}

window.removeFile = (index) => {
  selectedFiles.splice(index, 1);
  renderFilesList();
};

window.removeFolder = (index) => {
  selectedFolders.splice(index, 1);
  renderFilesList();
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Backup
backupBtn.addEventListener('click', async () => {
  const repo = repoSelect.value;
  if (!repo) {
    showError('Please select a repository');
    return;
  }

  if (selectedFiles.length === 0 && selectedFolders.length === 0) {
    showError('Please select files or folders to backup');
    return;
  }

  backupBtn.disabled = true;
  backupProgress.style.display = 'block';
  backupResult.innerHTML = '';
  backupResult.className = 'result-section';

  const remotePath = backupPath.value.trim() || 'backups/';
  let uploaded = 0;
  const errors = [];

  // Collect all files to upload
  const allFiles = [];

  // Add individual files
  selectedFiles.forEach(file => {
    allFiles.push({
      absolutePath: file.path,
      remotePath: `${remotePath}${file.name}`,
      displayName: file.name
    });
  });

  // Add files from folders
  selectedFolders.forEach(folder => {
    folder.files.forEach(file => {
      // Preserve folder structure
      const remoteFilePath = `${remotePath}${folder.name}/${file.relativePath}`;
      allFiles.push({
        absolutePath: file.absolutePath,
        remotePath: remoteFilePath,
        displayName: `${folder.name}/${file.relativePath}`
      });
    });
  });

  const total = allFiles.length;

  for (const file of allFiles) {
    progressText.textContent = `Uploading ${uploaded + 1}/${total}: ${file.displayName}`;
    progressFill.style.width = `${(uploaded / total) * 100}%`;

    const result = await ipcRenderer.invoke('upload-file', file.absolutePath, repo, file.remotePath);

    if (result.success) {
      uploaded++;
    } else {
      errors.push(`${file.displayName}: ${result.error}`);
    }
  }

  progressFill.style.width = '100%';
  backupProgress.style.display = 'none';
  backupBtn.disabled = false;

  if (errors.length === 0) {
    backupResult.className = 'result-section success';
    backupResult.innerHTML = `<strong>✅ Success!</strong><br>Backed up ${uploaded} file(s) to ${escapeHtml(repo)}`;
    selectedFiles = [];
    selectedFolders = [];
    renderFilesList();
  } else {
    backupResult.className = 'result-section error';
    backupResult.innerHTML = `<strong>⚠️ Partial Success</strong><br>Uploaded ${uploaded}/${total} files<br><br>Errors:<br>${errors.map(e => escapeHtml(e)).join('<br>')}`;
  }
});

// Restore functionality
listFilesBtn.addEventListener('click', async () => {
  const repo = restoreRepoSelect.value;
  if (!repo) {
    showError('Please select a repository');
    return;
  }

  const path = restorePath.value.trim() || '';
  listFilesBtn.disabled = true;
  listFilesBtn.textContent = 'Loading...';

  const result = await ipcRenderer.invoke('list-repo-files', repo, path);

  if (result.success) {
    renderRestoreFilesList(result.files);
  } else {
    showError('Failed to list files: ' + result.error);
    restoreFilesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>Error loading files</p></div>';
  }

  listFilesBtn.disabled = false;
  listFilesBtn.textContent = '📋 List Files';
});

function renderRestoreFilesList(files) {
  const fileItems = files.filter(f => f.type === 'file');

  if (fileItems.length === 0) {
    restoreFilesList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>No files found</p></div>';
    restoreLocationGroup.style.display = 'none';
    restoreBtn.style.display = 'none';
    return;
  }

  restoreFilesList.innerHTML = fileItems.map((file, index) => `
    <div class="file-item">
      <input type="checkbox" class="file-checkbox" data-index="${index}" data-path="${file.path}" />
      <div class="file-info">
        <div class="file-name">📄 ${file.name}</div>
        <div class="file-details">${formatSize(file.size)} - ${file.path}</div>
      </div>
    </div>
  `).join('');

  // Add event listeners to checkboxes
  document.querySelectorAll('.file-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateRestoreSelection);
  });

  restoreLocationGroup.style.display = 'block';
}

function updateRestoreSelection() {
  selectedRestoreFiles = [];
  document.querySelectorAll('.file-checkbox:checked').forEach(checkbox => {
    selectedRestoreFiles.push(checkbox.dataset.path);
  });

  if (selectedRestoreFiles.length > 0 && restoreLocation.value) {
    restoreBtn.style.display = 'block';
  } else {
    restoreBtn.style.display = 'none';
  }
}

selectFolderBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folder');

  if (!result.canceled) {
    restoreLocation.value = result.folder;
    updateRestoreSelection();
  }
});

restoreBtn.addEventListener('click', async () => {
  const repo = restoreRepoSelect.value;
  if (!repo || selectedRestoreFiles.length === 0 || !restoreLocation.value) {
    return;
  }

  restoreBtn.disabled = true;
  restoreProgress.style.display = 'block';
  restoreResult.innerHTML = '';
  restoreResult.className = 'result-section';

  let restored = 0;
  const total = selectedRestoreFiles.length;
  const errors = [];

  for (const filePath of selectedRestoreFiles) {
    const fileName = filePath.split('/').pop();
    const savePath = `${restoreLocation.value}/${fileName}`;

    restoreProgressText.textContent = `Restoring ${restored + 1}/${total}: ${fileName}`;
    restoreProgressFill.style.width = `${(restored / total) * 100}%`;

    const result = await ipcRenderer.invoke('download-file', repo, filePath, savePath);

    if (result.success) {
      restored++;
    } else {
      errors.push(`${fileName}: ${result.error}`);
    }
  }

  restoreProgressFill.style.width = '100%';
  restoreProgress.style.display = 'none';
  restoreBtn.disabled = false;

  if (errors.length === 0) {
    restoreResult.className = 'result-section success';
    restoreResult.innerHTML = `<strong>✅ Success!</strong><br>Restored ${restored} file(s) to ${escapeHtml(restoreLocation.value)}`;
    selectedRestoreFiles = [];
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
    updateRestoreSelection();
  } else {
    restoreResult.className = 'result-section error';
    restoreResult.innerHTML = `<strong>⚠️ Partial Success</strong><br>Restored ${restored}/${total} files<br><br>Errors:<br>${errors.map(e => escapeHtml(e)).join('<br>')}`;
  }
});

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (tab === 'backup') {
      backupSection.style.display = 'block';
      restoreSection.style.display = 'none';
    } else if (tab === 'restore') {
      backupSection.style.display = 'none';
      restoreSection.style.display = 'block';
    }
  });
});

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  // You can implement a toast notification system here
  alert(message);
}

function showSuccess(message) {
  alert(message);
}

// Initialize the app
init();
