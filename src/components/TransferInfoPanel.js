import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../store';

const TABS = [
  { key: 'history', label: 'History' },
  { key: 'passwords', label: 'Passwords' },
  { key: 'autofill', label: 'Autofill' },
  { key: 'bookmarks', label: 'Bookmarks' },
];

function TransferInfoPanel({ onClose }) {
  const { chromeProfile, setChromeProfile } = useStore();
  const [activeTab, setActiveTab] = useState('history');
  const [search, setSearch] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  if (!chromeProfile) return null;

  const q = search.toLowerCase();

  const filterMatch = (str) => !q || (str && str.toLowerCase().includes(q));

  const togglePassword = (idx) => {
    setShowPasswords(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderHistory = () => {
    const items = (chromeProfile.history || []).filter(h => filterMatch(h.url) || filterMatch(h.title));
    if (items.length === 0) return <div className="transfer-info-empty">No history entries{q ? ' matching search' : ''}</div>;
    return (
      <div className="transfer-info-list">
        {items.slice(0, 200).map((h, i) => (
          <div key={i} className="transfer-info-row">
            <div className="transfer-info-row-main">
              <span className="transfer-info-title">{h.title || '(untitled)'}</span>
              <span className="transfer-info-url">{h.url}</span>
            </div>
            <div className="transfer-info-row-meta">
              {h.visitCount > 1 && <span className="transfer-info-badge">{h.visitCount} visits</span>}
              {h.lastVisit && <span className="transfer-info-date">{new Date(h.lastVisit).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        {items.length > 200 && <div className="transfer-info-truncated">Showing 200 of {items.length.toLocaleString()}</div>}
      </div>
    );
  };

  const renderPasswords = () => {
    const items = (chromeProfile.passwords || []).filter(p => filterMatch(p.url) || filterMatch(p.username));
    if (items.length === 0) return <div className="transfer-info-empty">No saved logins{q ? ' matching search' : ''}</div>;
    return (
      <div className="transfer-info-list">
        {items.slice(0, 200).map((p, i) => (
          <div key={i} className="transfer-info-row">
            <div className="transfer-info-row-main">
              <span className="transfer-info-url">{p.url}</span>
              <span className="transfer-info-detail">
                <span className="transfer-info-label">User:</span> {p.username || '(none)'}
              </span>
              <span className="transfer-info-detail">
                <span className="transfer-info-label">Pass:</span>{' '}
                {showPasswords[i] ? (
                  <span className="transfer-info-password-visible">{p.password || '(empty)'}</span>
                ) : (
                  <span className="transfer-info-password-hidden">{'*'.repeat(Math.min(p.password?.length || 8, 16))}</span>
                )}
                <button className="transfer-info-toggle-pw" onClick={() => togglePassword(i)}>
                  {showPasswords[i] ? 'hide' : 'show'}
                </button>
              </span>
            </div>
          </div>
        ))}
        {items.length > 200 && <div className="transfer-info-truncated">Showing 200 of {items.length.toLocaleString()}</div>}
      </div>
    );
  };

  const renderAutofill = () => {
    const entries = (chromeProfile.autofill?.entries || []).filter(a => filterMatch(a.name) || filterMatch(a.value));
    const addresses = (chromeProfile.autofill?.addresses || []).filter(a =>
      filterMatch(a.firstName) || filterMatch(a.lastName) || filterMatch(a.email) || filterMatch(a.phone)
    );
    if (entries.length === 0 && addresses.length === 0) {
      return <div className="transfer-info-empty">No autofill data{q ? ' matching search' : ''}</div>;
    }
    return (
      <div className="transfer-info-list">
        {addresses.length > 0 && (
          <>
            <div className="transfer-info-section-label">Address Profiles</div>
            {addresses.map((a, i) => (
              <div key={`addr-${i}`} className="transfer-info-row">
                <div className="transfer-info-row-main">
                  <span className="transfer-info-title">
                    {[a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ') || '(unnamed)'}
                  </span>
                  {a.email && <span className="transfer-info-detail"><span className="transfer-info-label">Email:</span> {a.email}</span>}
                  {a.phone && <span className="transfer-info-detail"><span className="transfer-info-label">Phone:</span> {a.phone}</span>}
                </div>
              </div>
            ))}
          </>
        )}
        {entries.length > 0 && (
          <>
            <div className="transfer-info-section-label">Form Fields</div>
            {entries.slice(0, 100).map((e, i) => (
              <div key={`entry-${i}`} className="transfer-info-row transfer-info-row-compact">
                <span className="transfer-info-field-name">{e.name}</span>
                <span className="transfer-info-field-value">{e.value}</span>
                {e.count > 1 && <span className="transfer-info-badge">{e.count}x</span>}
              </div>
            ))}
            {entries.length > 100 && <div className="transfer-info-truncated">Showing 100 of {entries.length.toLocaleString()}</div>}
          </>
        )}
      </div>
    );
  };

  const renderBookmarks = () => {
    const items = (chromeProfile.bookmarks || []).filter(b => filterMatch(b.name) || filterMatch(b.url));
    if (items.length === 0) return <div className="transfer-info-empty">No bookmarks{q ? ' matching search' : ''}</div>;
    return (
      <div className="transfer-info-list">
        {items.slice(0, 200).map((b, i) => (
          <div key={i} className="transfer-info-row">
            <div className="transfer-info-row-main">
              <span className="transfer-info-title">{b.name || '(untitled)'}</span>
              <span className="transfer-info-url">{b.url}</span>
            </div>
            {b.folder && <span className="transfer-info-folder">{b.folder}</span>}
          </div>
        ))}
        {items.length > 200 && <div className="transfer-info-truncated">Showing 200 of {items.length.toLocaleString()}</div>}
      </div>
    );
  };

  const getCounts = () => ({
    history: chromeProfile.history?.length || 0,
    passwords: chromeProfile.passwords?.length || 0,
    autofill: (chromeProfile.autofill?.entries?.length || 0) + (chromeProfile.autofill?.addresses?.length || 0),
    bookmarks: chromeProfile.bookmarks?.length || 0,
  });

  const counts = getCounts();

  const handleClear = () => {
    setChromeProfile(null);
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="transfer-info-overlay" onClick={onClose}>
      <div className="transfer-info-panel" onClick={(e) => e.stopPropagation()}>
        <div className="transfer-info-header">
          <div className="transfer-info-header-left">
            <span className="transfer-info-header-title">Transfer Info</span>
            <span className="transfer-info-header-profile">{chromeProfile.profileName}</span>
          </div>
          <div className="transfer-info-header-right">
            <button className="transfer-info-clear-btn" onClick={handleClear}>Clear Data</button>
            <button className="transfer-info-close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="transfer-info-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`transfer-info-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              <span className="transfer-info-tab-count">{counts[t.key].toLocaleString()}</span>
            </button>
          ))}
        </div>
        <div className="transfer-info-search">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="transfer-info-content">
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'passwords' && renderPasswords()}
          {activeTab === 'autofill' && renderAutofill()}
          {activeTab === 'bookmarks' && renderBookmarks()}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TransferInfoPanel;
