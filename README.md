# GitBackup 🔄

An Electron desktop application that allows you to backup and restore your files using GitHub as cloud storage.

## Features

- 🔐 **GitHub Authentication** - Secure authentication using GitHub Personal Access Tokens
- 📤 **File Backup** - Backup multiple files to any GitHub repository
- 📥 **File Restore** - Restore backed up files from GitHub repositories
- 🆕 **Create Repositories** - Create new GitHub repositories directly from the app
- 🔒 **Privacy** - Support for private repositories
- 📊 **Progress Tracking** - Real-time progress updates during backup/restore operations
- 💾 **Persistent Settings** - Your GitHub token is securely stored locally

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A GitHub account

### Setup

1. Clone this repository:
```bash
git clone https://github.com/bitcoinbrisbane/gitbackup.git
cd gitbackup
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

## Usage

### Getting a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "GitBackup App")
4. Select the following scopes:
   - ✅ `repo` (Full control of repositories)
5. Click "Generate token"
6. Copy the token (you won't be able to see it again!)

### Backing Up Files

1. **Authenticate**: Paste your GitHub Personal Access Token in the authentication section
2. **Select Repository**: Choose an existing repository or create a new one
3. **Select Files**: Click "Select Files to Backup" and choose the files you want to backup
4. **Set Backup Path**: Specify a folder path in the repository (default: `backups/`)
5. **Start Backup**: Click "Start Backup" to upload your files to GitHub

### Restoring Files

1. Switch to the "Restore" tab
2. **Select Repository**: Choose the repository containing your backups
3. **Set Repository Path**: Specify the path where your files are stored
4. **List Files**: Click "List Files" to see available backups
5. **Select Files**: Check the files you want to restore
6. **Choose Destination**: Select a folder where files will be restored
7. **Restore**: Click "Restore Selected Files"

## Building for Production

To build the application for your platform:

```bash
# Install electron-builder
npm install --save-dev electron-builder

# Build for your platform
npm run build
```

## Security Notes

- Your GitHub token is stored locally using electron-store and is never transmitted except to GitHub's API
- Always use tokens with minimal necessary permissions
- Keep your tokens secure and never share them
- You can revoke tokens at any time from your GitHub settings

## Technologies Used

- **Electron** - Cross-platform desktop application framework
- **GitHub REST API** - For repository and file operations via @octokit/rest
- **electron-store** - Secure local storage for settings

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
