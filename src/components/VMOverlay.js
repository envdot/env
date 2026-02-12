import React, { useState, useEffect, useRef } from 'react';
import { useStore, executeTool } from '../store';

// All VMs run via QEMU with HVF acceleration — single dependency
const QEMU_CLI = 'qemu-system-aarch64';
const QEMU_CHECK = 'which qemu-system-aarch64';
const QEMU_INSTALL = 'brew install qemu';

const VM_OPTIONS = [
  {
    os: 'macos',
    label: 'macOS',
    memory: '~4–8 GB RAM',
    disk: '~15–30 GB disk',
    installNote: 'QEMU + HVF acceleration. Downloads macOS restore image on first launch.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    os: 'linux',
    label: 'Linux',
    memory: '~1–2 GB RAM',
    disk: '~2–5 GB disk',
    installNote: 'QEMU + HVF acceleration. Uses Ubuntu cloud image.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 448 512" fill="currentColor">
        <path d="M220.8 123.3c1 .5 1.8 1.7 3 1.7 1.1 0 2.8-.4 2.9-1.5.2-1.4-1.9-2.3-3.2-2.9-1.7-.7-3.9-1-5.5-.1-.4.2-.8.7-.6 1.1.3 1.3 2.3 1.1 3.4 1.7zm-21.9 1.7c1.2 0 2-1.2 3-1.7 1.1-.6 3.1-.4 3.5-1.6.2-.4-.2-.9-.6-1.1-1.6-.9-3.8-.6-5.5.1-1.3.6-3.4 1.5-3.2 2.9.1 1 1.8 1.5 2.8 1.4zM420 403.8c-3.6-4-5.3-11.6-7.2-19.7-1.8-8.1-3.9-16.8-10.5-22.4-1.3-1.1-2.6-2.1-4-2.9-1.3-.8-2.7-1.5-4.1-2 9.2-27.3 5.6-54.5-3.7-79.1-11.4-30.1-31.3-56.4-46.5-74.4-17.1-21.5-33.7-41.9-33.4-72C311.1 85.4 315.7.1 234.8 0 132.4-.2 158 103.4 156.9 135.2c-1.7 23.4-6.4 41.8-22.5 64.7-18.9 22.5-45.5 58.8-58.1 96.7-6 17.9-8.8 36.1-6.2 53.3-6.5 5.8-11.4 14.7-16.6 20.2-4.2 4.3-10.3 5.9-17 8.3s-14 6-18.5 14.5c-2.1 3.9-2.8 8.1-2.8 12.4 0 3.9.6 7.9 1.2 11.8 1.2 8.1 2.5 15.7.8 20.8-5.2 14.4-5.9 24.4-2.2 31.7 3.8 7.3 11.4 10.5 20.1 12.3 17.3 3.6 40.8 2.7 59.3 12.5 19.8 10.4 39.9 14.1 55.9 10.4 11.6-2.6 21.1-9.6 25.9-20.2 12.5-.1 26.3-5.4 48.3-6.6 14.9-1.2 33.6 5.3 55.1 4.1.6 2.3 1.4 4.6 2.5 6.7v.1c8.3 16.7 23.8 24.3 40.3 23 16.6-1.3 34.1-11 48.3-27.9 13.6-16.4 36-23.2 50.9-32.2 7.4-4.5 13.4-10.1 13.9-18.3.4-8.2-4.4-17.3-15.5-29.7z"/>
      </svg>
    ),
  },
  {
    os: 'windows',
    label: 'Windows',
    memory: '~4–8 GB RAM',
    disk: '~20+ GB disk',
    installNote: 'QEMU + HVF acceleration. Requires Windows ARM ISO.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="2" width="9.25" height="9.25" />
        <rect x="12.75" y="2" width="9.25" height="9.25" />
        <rect x="2" y="12.75" width="9.25" height="9.25" />
        <rect x="12.75" y="12.75" width="9.25" height="9.25" />
      </svg>
    ),
  },
];

export default function VMOverlay({ onClose, onLaunch }) {
  const overlayRef = useRef(null);
  const logEndRef = useRef(null);
  const [statuses, setStatuses] = useState({});
  const [installing, setInstalling] = useState(null);
  const [installLog, setInstallLog] = useState([]);
  const [installPhase, setInstallPhase] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [launching, setLaunching] = useState(null);
  const launchingRef = useRef(null);
  const [error, setError] = useState(null);
  const [modeSelection, setModeSelection] = useState({}); // { linux: null, windows: null, macos: null }
  const runningVMs = useStore(state => state.runningVMs);

  // Check QEMU installation status on mount (single check for all OS cards)
  useEffect(() => {
    const checkQemu = async () => {
      const initial = {};
      VM_OPTIONS.forEach(v => { initial[v.os] = 'checking'; });
      setStatuses(initial);

      try {
        const result = await window.electronAPI.shell.exec(QEMU_CHECK);
        const status = (result.success && result.stdout?.trim()) ? 'installed' : 'not_installed';
        const next = {};
        VM_OPTIONS.forEach(v => { next[v.os] = status; });
        setStatuses(next);
      } catch {
        const next = {};
        VM_OPTIONS.forEach(v => { next[v.os] = 'not_installed'; });
        setStatuses(next);
      }
    };
    checkQemu();
  }, []);

  // Auto-scroll install log
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [installLog]);

  // Close on backdrop click
  useEffect(() => {
    const handleClick = (e) => {
      if (overlayRef.current === e.target && !installing) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, installing]);

  // Parse brew output to extract phase info
  const parseBrewLine = (line) => {
    const l = line.trim();
    if (l.startsWith('==> Downloading')) {
      setInstallPhase('Downloading...');
      setInstallProgress(20);
    } else if (l.startsWith('==> Fetching')) {
      setInstallPhase('Fetching dependencies...');
      setInstallProgress(15);
    } else if (l.includes('Already downloaded')) {
      setInstallPhase('Using cached download');
      setInstallProgress(40);
    } else if (l.startsWith('==> Installing')) {
      setInstallPhase('Installing...');
      setInstallProgress(50);
    } else if (l.startsWith('==> Pouring')) {
      setInstallPhase('Pouring bottle...');
      setInstallProgress(70);
    } else if (l.startsWith('==> Caveats')) {
      setInstallPhase('Configuring...');
      setInstallProgress(85);
    } else if (l.includes('was successfully installed') || l.includes('is already installed')) {
      setInstallPhase('Done!');
      setInstallProgress(100);
    } else if (l.startsWith('==> ')) {
      setInstallPhase(l.slice(4));
    }
    // Percentage-style progress from download
    const pctMatch = l.match(/(\d{1,3})%/);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10);
      // Scale download progress to 20-50 range
      setInstallProgress(20 + Math.round(pct * 0.3));
    }
  };

  const handleInstall = async (vm) => {
    setInstalling(vm.os);
    setInstallLog([]);
    setInstallPhase('Starting...');
    setInstallProgress(5);
    setError(null);

    try {
      const { id } = await window.electronAPI.shell.execStream(QEMU_INSTALL);

      const cleanup = window.electronAPI.shell.onStreamData((data) => {
        if (data.id !== id) return;

        if (data.type === 'stdout' || data.type === 'stderr') {
          const lines = data.data.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            setInstallLog(prev => [...prev.slice(-200), { type: data.type, text: line }]);
            parseBrewLine(line);
          });
        }

        if (data.type === 'exit') {
          cleanup();
          if (data.code === 0) {
            (async () => {
              // Create VM storage directory
              setInstallPhase('Setting up VM storage...');
              setInstallProgress(90);
              setInstallLog(prev => [...prev, { type: 'stdout', text: '==> Creating VM storage directory...' }]);
              await window.electronAPI.shell.exec('mkdir -p ~/.env-vms');

              setInstallPhase('Installed successfully!');
              setInstallProgress(100);
              // Mark ALL OS cards as installed since they share QEMU
              const next = {};
              VM_OPTIONS.forEach(v => { next[v.os] = 'installed'; });
              setStatuses(next);
              setTimeout(() => setInstalling(null), 1500);
            })();
          } else {
            setInstallPhase('Install failed');
            setError(`Process exited with code ${data.code}`);
            setInstalling(null);
          }
        }

        if (data.type === 'error') {
          cleanup();
          setInstallPhase('Error');
          setError(data.data);
          setInstalling(null);
        }
      });
    } catch (e) {
      setError(`Failed to start install: ${e.message}`);
      setInstalling(null);
    }
  };

  const handleLaunch = async (vm, mode) => {
    setLaunching(vm.os);
    launchingRef.current = vm.os;
    setInstallLog([]);
    setInstallPhase('Preparing VM...');
    setInstallProgress(10);
    setError(null);

    const isGui = mode === 'gui';
    const headless = !isGui;

    // Show progress inline while executeTool runs
    const phases = isGui ? [
      { delay: 2000, phase: 'Creating disk image...', pct: 15 },
      { delay: 6000, phase: 'Starting QEMU...', pct: 30 },
      { delay: 12000, phase: 'Booting VM...', pct: 50 },
      { delay: 20000, phase: 'Waiting for display...', pct: 70 },
      { delay: 30000, phase: 'Connecting...', pct: 85 },
    ] : [
      { delay: 2000, phase: 'Creating disk image...', pct: 20 },
      { delay: 6000, phase: 'Starting QEMU...', pct: 40 },
      { delay: 12000, phase: 'Booting VM...', pct: 60 },
      { delay: 20000, phase: 'Waiting for SSH...', pct: 80 },
    ];
    const timers = phases.map(p =>
      setTimeout(() => {
        if (launchingRef.current === vm.os) {
          setInstallPhase(p.phase);
          setInstallProgress(p.pct);
        }
      }, p.delay)
    );

    const result = await executeTool('open_vm', { os: vm.os, headless });
    timers.forEach(clearTimeout);
    setLaunching(null);
    launchingRef.current = null;
    setInstallProgress(0);
    setInstallPhase('');
    setModeSelection(prev => ({ ...prev, [vm.os]: null }));

    if (result.success) {
      if (onLaunch) onLaunch(vm.os, result);
      onClose();
    } else {
      setError(result.error || 'Failed to launch VM.');
    }
  };

  const [stopping, setStopping] = useState(null);

  const handleEndSession = async (vm) => {
    setStopping(vm.id);
    try {
      // Kill QEMU via pidfile
      if (vm.pidFile) {
        await window.electronAPI.shell.exec(`kill $(cat ${vm.pidFile}) 2>/dev/null; rm -f ${vm.pidFile}`);
      }
      // Clean up sockets
      if (vm.qgaSock) await window.electronAPI.shell.exec(`rm -f ${vm.qgaSock}`);
      if (vm.qmpSock) await window.electronAPI.shell.exec(`rm -f ${vm.qmpSock}`);
      // Remove from store
      useStore.getState().removeRunningVM(vm.id);
    } catch (e) {
      setError(`Failed to stop VM: ${e.message}`);
    }
    setStopping(null);
  };

  const runningList = Object.values(runningVMs);

  return (
    <div className="vm-overlay-backdrop" ref={overlayRef}>
      <div className="vm-overlay">
        <div className="vm-overlay-header">
          <span>Virtual Machines</span>
          <button className="vm-overlay-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && !installing && (
          <div className="vm-overlay-error">
            {error}
            <button onClick={() => setError(null)}>dismiss</button>
          </div>
        )}

        <div className="vm-overlay-cards">
          {VM_OPTIONS.map(vm => {
            const status = statuses[vm.os] || 'checking';
            const isRunning = runningList.some(r => r.os === vm.os && r.status === 'running');
            const isInstalling = installing === vm.os;
            const isLaunching = launching === vm.os;

            const isActive = isInstalling || isLaunching;

            return (
              <div key={vm.os} className={`vm-card ${isRunning ? 'vm-card-running' : ''} ${isActive ? 'vm-card-installing' : ''}`}>
                <div className="vm-card-row">
                  <div className="vm-card-icon">{vm.icon}</div>
                  <div className="vm-card-info">
                    <div className="vm-card-label">
                      {vm.label}
                      {isRunning && !isLaunching && <span className="vm-card-running-badge">running</span>}
                    </div>
                    <div className="vm-card-meta">
                      <span>{vm.memory}</span>
                      <span className="vm-card-dot">&middot;</span>
                      <span>{vm.disk}</span>
                    </div>
                    <div className="vm-card-cli">
                      {status === 'checking' && <span className="vm-card-checking">checking qemu...</span>}
                      {status === 'installed' && !isActive && <span className="vm-card-installed">qemu ready</span>}
                      {status === 'not_installed' && !isActive && <span className="vm-card-missing">qemu not found</span>}
                      {isActive && <span className="vm-card-checking">{installPhase}</span>}
                    </div>
                    {status === 'not_installed' && !isActive && (
                      <div className="vm-card-install-note">{vm.installNote}</div>
                    )}
                  </div>
                  <div className="vm-card-actions">
                    {/* Mode picker: Headless / GUI — shown for all OS cards */}
                    {status === 'installed' && !isActive && !modeSelection[vm.os] && (
                      <div className="vm-mode-picker">
                        <button
                          className="vm-mode-btn"
                          onClick={() => { setModeSelection(prev => ({ ...prev, [vm.os]: 'headless' })); handleLaunch(vm, 'headless'); }}
                          disabled={!!installing || !!launching}
                          title="SSH/QGA only — lightweight, fast"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                          </svg>
                          Headless
                        </button>
                        <button
                          className="vm-mode-btn vm-mode-btn-gui"
                          onClick={() => { setModeSelection(prev => ({ ...prev, [vm.os]: 'gui' })); handleLaunch(vm, 'gui'); }}
                          disabled={!!installing || !!launching}
                          title="Full display window"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          GUI
                        </button>
                      </div>
                    )}
                    {/* After a launch, show Launch again to reset picker */}
                    {status === 'installed' && !isActive && modeSelection[vm.os] && (
                      <button
                        className="vm-card-launch-btn"
                        onClick={() => setModeSelection(prev => ({ ...prev, [vm.os]: null }))}
                        disabled={!!launching || !!installing}
                      >
                        {isRunning ? 'New Instance' : 'Launch'}
                      </button>
                    )}
                    {status === 'not_installed' && !isActive && (
                      <button
                        className="vm-card-install-btn"
                        onClick={() => handleInstall(vm)}
                        disabled={!!installing}
                      >
                        Install
                      </button>
                    )}
                    {status === 'checking' && (
                      <div className="vm-card-spinner" />
                    )}
                  </div>
                </div>

                {/* Progress area (install or launch) */}
                {isActive && (
                  <div className="vm-install-progress">
                    <div className="vm-install-bar-track">
                      <div
                        className="vm-install-bar-fill"
                        style={{ width: `${installProgress}%` }}
                      />
                    </div>
                    {installLog.length > 0 && (
                      <div className="vm-install-log">
                        {installLog.map((entry, i) => (
                          <div key={i} className={`vm-log-line ${entry.type === 'stderr' ? 'vm-log-stderr' : ''}`}>
                            {entry.text}
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {runningList.length > 0 && (
          <div className="vm-overlay-running">
            <div className="vm-overlay-running-header">Active VMs</div>
            {runningList.map(vm => (
              <div key={vm.id} className="vm-running-row">
                <span className="vm-running-dot" />
                <span className="vm-running-name">{vm.id}</span>
                <span className="vm-running-os">{vm.os}</span>
                {vm.ip && <span className="vm-running-ip">{vm.ip}</span>}
                <button
                  className="vm-end-session-btn"
                  onClick={() => handleEndSession(vm)}
                  disabled={stopping === vm.id}
                  title="Shut down and remove this VM"
                >
                  {stopping === vm.id ? 'Stopping...' : 'End Session'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
