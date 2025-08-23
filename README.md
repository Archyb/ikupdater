# IkDevUpdater

An Electron application for managing and synchronizing development projects with an elegant visual interface. Automatically detects PHP and Node/TypeScript projects and provides tools for Git operations, dependency installation, and project management.

## Features

### 🚀 **Project Detection**
- **Automatic scanning** of user-selected directories for development projects
- **Technology detection**: PHP (via `composer.json`), Node/TypeScript (via `package.json`)
- **Smart identification** of package managers (npm vs yarn based on `yarn.lock` presence)

### 🔧 **Git Operations**
- **Safe Git synchronization** with configurable strategies per project:
  - **Pull Strategy**: `git fetch --all --prune` → `git checkout <branch>` → `git pull origin <branch>`
  - **Rebase Strategy**: `git fetch --all --prune` → `git checkout <branch>` → `git rebase origin/<branch>`
- **Branch selection** via dropdown populated with available Git branches
- **Non-interactive operations** (SSH prompts disabled for automation)
- **Repository safety** - no destructive operations, no forced merges

### 📦 **Dependency Management**
- **PHP Projects**: 
  - Runs `composer install --ignore-platform-reqs`
  - **PHP version check**: Minimum 7.3 required (skips if version < 7.3)
- **Node/TypeScript Projects**:
  - Automatically detects `yarn.lock` vs `package-lock.json`
  - Runs `npm install --loglevel info` or `yarn install --verbose`
  - **NVM integration**: Automatically runs `nvm use` if `.nvmrc` file is present

### 🎨 **User Interface**
- **Elegant visual design** with modern UI components
- **Dark/Light theme** with persistent user preference
- **Brand styling**: "IkDevUpdater" title with custom brand color (#0098ff)
- **Project cards** displaying:
  - Project name, path, and detected technologies
  - Include/exclude checkbox for bulk operations
  - Branch selector dropdown
  - Git strategy selector (Pull/Rebase)
  - Individual action buttons (Git, PHP, Node, Sync)
  - Real-time logs for each project

### ⚡ **Bulk Operations**
- **Selective automation**: Include/exclude specific projects from bulk operations
- **Bulk actions**: Run Git, PHP, or Node operations on multiple projects simultaneously
- **Global console**: Aggregated logs from all operations

### 💾 **Configuration & Persistence**
- **Base directory** selection saved across sessions
- **Per-project settings**:
  - Include/exclude status
  - Preferred Git branch
  - Git strategy preference (Pull/Rebase)
- **Theme preference** (Dark/Light)
- **Settings stored** in Electron's `userData` directory

## Prerequisites

- **macOS** (primary target platform)
- **Node.js** (latest LTS version recommended)
- **npm** or **yarn** package manager
- **nvm** (Node Version Manager) installed in `$HOME/.nvm` for `.nvmrc` support
- **PHP** ≥ 7.3 (for Composer operations)
- **Git** with SSH access configured
- **Composer** (for PHP projects)

## Development

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run start
```

### Build Tailwind CSS
```bash
npm run tw:build
```

## Building for Distribution

### Create macOS Executable
```bash
npm run dist
```

### Build Outputs
Generated in `dist/` directory:
- `IkDevUpdater-<version>-arm64.dmg` - macOS installer
- `IkDevUpdater-<version>-arm64-mac.zip` - macOS application bundle

**Note**: Without macOS developer certificate, the app won't be code-signed. Gatekeeper may show warnings. Add proper signing via electron-builder configuration if needed.

## Usage

### Getting Started
1. **Launch** the application
2. **Select** the base directory containing your development projects
3. **Review** detected projects and their technologies
4. **Configure** per-project settings:
   - Check/uncheck "Include" for bulk operations
   - Select preferred Git branch from dropdown
   - Choose Git strategy (Pull or Rebase)
5. **Execute** actions:
   - **Individual**: Click Git, PHP, Node, or Sync buttons per project
   - **Bulk**: Use bulk action buttons to process multiple projects

### Action Details
- **Git**: Fetches latest changes and updates to selected branch
- **PHP**: Installs Composer dependencies (if PHP ≥ 7.3)
- **Node**: Installs npm/yarn dependencies with NVM version management
- **Sync**: Executes Git → PHP → Node sequence for complete project update

### Monitoring
- **Per-project logs**: Real-time output displayed below each project card
- **Global console**: Aggregated logs from all operations at bottom of interface
- **Theme switching**: Toggle between dark and light themes via dropdown

## Architecture

### Main Process (`src/main/`)
- **`main.js`**: Main Electron process, window management, IPC orchestration
- **`config.js`**: Configuration management and persistence
- **`exec.js`**: Command execution utilities and output streaming
- **`git.js`**: Git-specific operations and branch management

### Renderer Process (`src/renderer/`)
- **`index.html`**: Main UI structure and layout
- **`renderer.js`**: UI logic, event handling, and project rendering
- **`tailwind.css`**: Tailwind CSS components and custom styling

### Preload (`src/preload.js`)
- **Secure API bridge** between main and renderer processes
- **Exposed functions**: `selectFolder`, `scanProjects`, `executeAction`, `getBranches`, etc.

## Git Safety Features

### Non-Destructive Operations
- **No automatic rebasing** without explicit user choice
- **Standard Git operations** - uses `git pull` (merge) or `git rebase` based on user preference
- **Safe checkout** - always fetches latest before operations
- **Conflict handling** - operations fail gracefully if conflicts detected

### Strategy Options
- **Pull Strategy**: Traditional merge approach using `git pull origin <branch>`, safer for shared branches
- **Rebase Strategy**: Cleaner history using `git rebase origin/<branch>`, but requires careful conflict resolution

## Troubleshooting

### Common Issues
- **nvm not detected**: Ensure `~/.nvm/nvm.sh` is properly sourced
- **PHP version too old**: Update PHP to ≥ 7.3 for Composer support
- **SSH prompts**: Disabled for automation (development environment only)
- **Git conflicts**: Operations will fail safely - resolve conflicts manually

### Performance Tips
- **Large repositories**: Git operations may take time on first fetch
- **Many projects**: Bulk operations process projects sequentially for stability
- **Log monitoring**: Use global console for overview, project logs for details

## Development Notes

### Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Custom components**: Brand-specific styling with CSS variables
- **Responsive design**: Adapts to different screen sizes and themes

### Configuration
- **Settings file**: Stored in `~/Library/Application Support/IkDevUpdater/config.json`
- **Backup**: Configuration can be manually backed up and restored

## License

This project is developed for internal development workflow management.
