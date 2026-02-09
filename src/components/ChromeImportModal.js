import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';

function ChromeImportModal({ onClose }) {
  const { setChromeProfile } = useStore();
  const [step, setStep] = useState(1); // 1=profile select, 2=data types, 3=progress/done
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [dataTypes, setDataTypes] = useState({
    history: true,
    bookmarks: true,
    autofill: true,
    passwords: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Load profiles on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI.chromeProfile.listProfiles();
        if (res.success) {
          setProfiles(res.profiles);
          if (res.profiles.length === 1) setSelectedProfile(res.profiles[0]);
        } else {
          setError(res.error || 'Could not detect Chrome profiles');
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const toggleDataType = (key) => {
    setDataTypes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImport = async () => {
    setStep(3);
    setLoading(true);
    setError(null);
    try {
      const types = Object.entries(dataTypes).filter(([, v]) => v).map(([k]) => k);
      const res = await window.electronAPI.chromeProfile.importProfile(selectedProfile.path, types);
      if (res.success) {
        const profileData = {
          ...res.data,
          importedAt: new Date().toISOString(),
          profileName: selectedProfile.displayName,
        };
        setChromeProfile(profileData);
        setResult(profileData);
      } else {
        setError(res.error || 'Import failed');
        // Still save partial data if available
        if (res.data && Object.keys(res.data).length > 0) {
          const profileData = {
            ...res.data,
            importedAt: new Date().toISOString(),
            profileName: selectedProfile.displayName,
          };
          setChromeProfile(profileData);
          setResult(profileData);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <div className="chrome-import-header">Select Chrome Profile</div>
      <div className="chrome-import-body">
        {error && <div className="chrome-import-error">{error}</div>}
        {profiles.length === 0 && !error && (
          <div className="chrome-import-empty">Scanning for Chrome profiles...</div>
        )}
        <div className="chrome-import-profiles">
          {profiles.map((p) => (
            <label key={p.dirName} className="chrome-import-profile-item">
              <input
                type="radio"
                name="chrome-profile"
                checked={selectedProfile?.dirName === p.dirName}
                onChange={() => setSelectedProfile(p)}
              />
              <div className="chrome-import-profile-info">
                <span className="chrome-import-profile-name">{p.displayName}</span>
                <span className="chrome-import-profile-dir">{p.dirName}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="chrome-import-footer">
        <button className="chrome-import-btn chrome-import-btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className="chrome-import-btn chrome-import-btn-primary"
          disabled={!selectedProfile}
          onClick={() => setStep(2)}
        >
          Next
        </button>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="chrome-import-header">Choose Data to Import</div>
      <div className="chrome-import-body">
        <div className="chrome-import-profile-badge">
          Profile: {selectedProfile?.displayName}
        </div>
        <div className="chrome-import-data-types">
          {[
            { key: 'history', label: 'Browsing History', desc: 'Recently visited URLs and page titles' },
            { key: 'bookmarks', label: 'Bookmarks', desc: 'Saved bookmarks and folders' },
            { key: 'autofill', label: 'Autofill Data', desc: 'Saved addresses, names, emails, phones' },
            { key: 'passwords', label: 'Passwords', desc: 'Saved login credentials', warn: true },
          ].map(({ key, label, desc, warn }) => (
            <label key={key} className="chrome-import-data-item">
              <input
                type="checkbox"
                checked={dataTypes[key]}
                onChange={() => toggleDataType(key)}
              />
              <div className="chrome-import-data-info">
                <span className="chrome-import-data-label">{label}</span>
                <span className="chrome-import-data-desc">{desc}</span>
                {warn && dataTypes[key] && (
                  <span className="chrome-import-data-warn">macOS will prompt for Keychain access</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="chrome-import-footer">
        <button className="chrome-import-btn chrome-import-btn-secondary" onClick={() => setStep(1)}>Back</button>
        <button
          className="chrome-import-btn chrome-import-btn-primary"
          disabled={!Object.values(dataTypes).some(Boolean)}
          onClick={handleImport}
        >
          Import
        </button>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="chrome-import-header">
        {loading ? 'Importing...' : error && !result ? 'Import Error' : 'Import Complete'}
      </div>
      <div className="chrome-import-body">
        {loading && (
          <div className="chrome-import-loading">
            <div className="chrome-import-spinner" />
            <span>Reading Chrome profile data...</span>
          </div>
        )}
        {error && <div className="chrome-import-error">{error}</div>}
        {result && (
          <div className="chrome-import-summary">
            {result.history && (
              <div className="chrome-import-summary-row">
                <span className="chrome-import-summary-count">{result.history.length.toLocaleString()}</span>
                <span>history entries</span>
              </div>
            )}
            {result.bookmarks && (
              <div className="chrome-import-summary-row">
                <span className="chrome-import-summary-count">{result.bookmarks.length.toLocaleString()}</span>
                <span>bookmarks</span>
              </div>
            )}
            {result.autofill && (
              <div className="chrome-import-summary-row">
                <span className="chrome-import-summary-count">{(result.autofill.entries?.length || 0).toLocaleString()}</span>
                <span>autofill entries</span>
                {result.autofill.addresses?.length > 0 && (
                  <span className="chrome-import-summary-extra"> + {result.autofill.addresses.length} address profiles</span>
                )}
              </div>
            )}
            {result.passwords && (
              <div className="chrome-import-summary-row">
                <span className="chrome-import-summary-count">{result.passwords.length.toLocaleString()}</span>
                <span>saved logins</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="chrome-import-footer">
        {!loading && (
          <button className="chrome-import-btn chrome-import-btn-primary" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </>
  );

  return ReactDOM.createPortal(
    <div className="chrome-import-overlay" onClick={onClose}>
      <div className="chrome-import-modal" onClick={(e) => e.stopPropagation()}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>,
    document.body
  );
}

export default ChromeImportModal;
