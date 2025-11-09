const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let octokit;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle GitHub authentication
ipcMain.handle('save-token', async (event, token) => {
  try {
    store.set('githubToken', token);
    octokit = new Octokit({ auth: token });
    
    // Verify token by getting user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    return { success: true, user: user.login };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-token', async () => {
  const token = store.get('githubToken');
  if (token) {
    octokit = new Octokit({ auth: token });
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      return { token, user: user.login };
    } catch (error) {
      return { token: null };
    }
  }
  return { token: null };
});

ipcMain.handle('clear-token', async () => {
  store.delete('githubToken');
  octokit = null;
  return { success: true };
});

// Handle file selection
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  return { 
    canceled: false, 
    files: result.filePaths.map(filePath => ({
      path: filePath,
      name: path.basename(filePath),
      size: fs.statSync(filePath).size
    }))
  };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return { canceled: true };
  }

  return {
    canceled: false,
    folder: result.filePaths[0]
  };
});

// Handle folder selection for backup (multiple folders)
ipcMain.handle('select-folders', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  });

  if (result.canceled) {
    return { canceled: true };
  }

  return {
    canceled: false,
    folders: result.filePaths
  };
});

// Recursively get all files in a folder
function getFilesRecursively(dirPath, baseDir = dirPath) {
  const files = [];

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, and other common directories
        if (item === 'node_modules' || item === '.git' || item === '.DS_Store') {
          continue;
        }
        traverse(fullPath);
      } else if (stat.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          absolutePath: fullPath,
          relativePath: relativePath,
          name: item,
          size: stat.size
        });
      }
    }
  }

  try {
    traverse(dirPath);
  } catch (error) {
    console.error('Error reading directory:', error);
  }

  return files;
}

// Handle getting files from folders
ipcMain.handle('get-folder-contents', async (event, folderPaths) => {
  try {
    const allFolders = [];

    for (const folderPath of folderPaths) {
      const files = getFilesRecursively(folderPath);
      allFolders.push({
        path: folderPath,
        name: path.basename(folderPath),
        files: files,
        fileCount: files.length
      });
    }

    return { success: true, folders: allFolders };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get list of repositories
ipcMain.handle('list-repos', async () => {
  if (!octokit) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });
    
    return { 
      success: true, 
      repos: repos.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create a new repository
ipcMain.handle('create-repo', async (event, repoName, isPrivate) => {
  if (!octokit) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      description: 'Backup repository created by GitBackup',
      auto_init: true
    });
    
    return { 
      success: true, 
      repo: {
        name: repo.name,
        fullName: repo.full_name
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Upload file to GitHub
ipcMain.handle('upload-file', async (event, filePath, repoFullName, remotePath) => {
  if (!octokit) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const [owner, repo] = repoFullName.split('/');
    const content = fs.readFileSync(filePath);
    const base64Content = content.toString('base64');
    
    // Check if file already exists to update it
    let sha;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: remotePath
      });
      sha = existingFile.sha;
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    const params = {
      owner,
      repo,
      path: remotePath,
      message: `Backup: ${path.basename(filePath)}`,
      content: base64Content
    };
    
    if (sha) {
      params.sha = sha;
    }
    
    await octokit.rest.repos.createOrUpdateFileContents(params);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Download file from GitHub
ipcMain.handle('download-file', async (event, repoFullName, remotePath, savePath) => {
  if (!octokit) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const [owner, repo] = repoFullName.split('/');
    
    const { data: file } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: remotePath
    });
    
    const content = Buffer.from(file.content, 'base64');
    fs.writeFileSync(savePath, content);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List files in a repository
ipcMain.handle('list-repo-files', async (event, repoFullName, dirPath = '') => {
  if (!octokit) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const [owner, repo] = repoFullName.split('/');
    
    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: dirPath
    });
    
    const files = Array.isArray(contents) ? contents : [contents];
    
    return { 
      success: true, 
      files: files.map(file => ({
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
