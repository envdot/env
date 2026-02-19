const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Get extended PATH that includes common CLI tool locations
 * This is necessary because packaged Electron apps don't inherit shell PATH
 */
function getExtendedPath() {
  const home = os.homedir();
  const basePath = process.env.PATH || '';

  // Common paths where CLI tools are installed
  const additionalPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    '/opt/homebrew/bin',           // Homebrew on Apple Silicon
    '/opt/homebrew/sbin',
    `${home}/.cargo/bin`,           // Rust/Cargo
    `${home}/.local/bin`,           // pipx, user scripts
    `${home}/go/bin`,               // Go binaries
    `${home}/bin`,                  // User binaries
  ];

  // Find NVM node versions
  const nvmDir = path.join(home, '.nvm', 'versions', 'node');
  if (fs.existsSync(nvmDir)) {
    try {
      const versions = fs.readdirSync(nvmDir);
      versions.forEach(v => {
        additionalPaths.push(path.join(nvmDir, v, 'bin'));
      });
    } catch (e) {
      // Ignore errors
    }
  }

  // Find pyenv versions
  const pyenvDir = path.join(home, '.pyenv', 'versions');
  if (fs.existsSync(pyenvDir)) {
    try {
      const versions = fs.readdirSync(pyenvDir);
      versions.forEach(v => {
        additionalPaths.push(path.join(pyenvDir, v, 'bin'));
      });
    } catch (e) {
      // Ignore errors
    }
  }

  // Find Python framework paths (macOS)
  const pythonFrameworkDir = '/Library/Frameworks/Python.framework/Versions';
  if (fs.existsSync(pythonFrameworkDir)) {
    try {
      const versions = fs.readdirSync(pythonFrameworkDir);
      versions.forEach(v => {
        additionalPaths.push(path.join(pythonFrameworkDir, v, 'bin'));
      });
    } catch (e) {
      // Ignore errors
    }
  }

  // Combine base PATH with additional paths, dedupe, and filter to existing
  const allPaths = [...new Set([...basePath.split(':'), ...additionalPaths])];
  const existingPaths = allPaths.filter(p => {
    try {
      return p && fs.existsSync(p);
    } catch {
      return false;
    }
  });

  return existingPaths.join(':');
}

module.exports = { getExtendedPath };
