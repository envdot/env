import React, { useState } from 'react';
import { useStore } from '../store';
import { API_BASE, STRIPE_PRICES } from '../lib/config';
import { usePlatform } from '../platform/PlatformContext';

function UpgradePlan({ onClose }) {
  const platform = usePlatform();
  const { setShowUpgradePlan, session, subscription } = useStore();
  const [planType, setPlanType] = useState('individual');
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  const handleBack = () => {
    setShowUpgradePlan(false);
  };

  const handleGetPlan = async (priceId, planName) => {
    if (!priceId) {
      setCheckoutError('Stripe price not configured yet. Set REACT_APP_STRIPE_PRICE_* in .env');
      return;
    }
    setCheckoutLoading(planName);
    setCheckoutError('');
    try {
      const response = await fetch(`${API_BASE}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, planName }),
      });
      const data = await response.json();
      if (data.url) {
        // Open Stripe Checkout in system browser
        if (platform?.openExternal) {
          await platform.openExternal(data.url);
        } else {
          window.open(data.url, '_blank');
        }
      } else {
        setCheckoutError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setCheckoutError(err.message);
    }
    setCheckoutLoading(null);
  };

  const currentPlan = subscription?.plan_name;

  const getPlanButton = (planName, priceId, label, isPrimary = false) => {
    const isCurrent = currentPlan === planName;
    const isLoading = checkoutLoading === planName;
    return (
      <button
        className={`plan-btn ${isPrimary ? 'plan-btn-primary' : 'plan-btn-secondary'}`}
        onClick={() => handleGetPlan(priceId, planName)}
        disabled={isCurrent || isLoading}
      >
        {isCurrent ? 'Current plan' : isLoading ? 'Loading...' : label}
      </button>
    );
  };

  return (
    <div className="upgrade-plan-overlay">
      <button className="upgrade-plan-back-btn" onClick={handleBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'rotate(180deg)' }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
      <div className="upgrade-plan-content">
        <div className="upgrade-plan-section">
          <div className="billing-header">
            <h1 className="billing-title">Plans that grow with you</h1>
            <div className="billing-toggle">
              <button
                className={`billing-toggle-btn ${planType === 'individual' ? 'active' : ''}`}
                onClick={() => setPlanType('individual')}
              >
                Individual
              </button>
              <button
                className={`billing-toggle-btn ${planType === 'team' ? 'active' : ''}`}
                onClick={() => setPlanType('team')}
              >
                Team and Enterprise
              </button>
            </div>
          </div>

          {checkoutError && (
            <div className="checkout-error">{checkoutError}</div>
          )}

          {planType === 'individual' && (
            <div className="plans-grid">
              {/* Pro Plan */}
              <div className="plan-card">
                <div className="plan-icon">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="20" cy="8" r="3" />
                    <line x1="20" y1="11" x2="20" y2="20" />
                    <circle cx="10" cy="28" r="3" />
                    <circle cx="20" cy="32" r="3" />
                    <circle cx="30" cy="28" r="3" />
                    <line x1="20" y1="20" x2="10" y2="25" />
                    <line x1="20" y1="20" x2="20" y2="29" />
                    <line x1="20" y1="20" x2="30" y2="25" />
                  </svg>
                </div>
                <h2 className="plan-name">Pro</h2>
                <p className="plan-description">Research, code, and organize</p>
                <div className="plan-price">
                  <span className="price-amount">$17</span>
                  <span className="price-period">/ month billed annually</span>
                </div>
                <div className="plan-notice">
                  <span className="notice-icon">i</span>
                  <div className="notice-text">
                    <strong>You are on a monthly billing plan.</strong>
                    <span>Pay annually to save 17%.</span>
                  </div>
                </div>
                {getPlanButton('pro', STRIPE_PRICES.pro_annual, 'Get Pro annual plan')}
                <div className="plan-divider"></div>
                <div className="plan-features">
                  <p className="features-header">Everything in Free and:</p>
                  <ul className="features-list">
                    <li>More usage than Free*</li>
                    <li>Access more Claude models</li>
                    <li>Unlimited Projects to organize chats</li>
                    <li>Unlock deep Research tools</li>
                    <li>Use extended thinking for complex work</li>
                    <li>Connect Google Workspace: email, calendar, and docs</li>
                    <li>Integrations with remote MCP</li>
                    <li>Includes Claude Code</li>
                    <li>Claude in Excel</li>
                  </ul>
                </div>
              </div>

              {/* Max Plan */}
              <div className="plan-card plan-card-featured">
                <div className="plan-icon">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="20" cy="8" r="3" />
                    <line x1="20" y1="11" x2="20" y2="20" />
                    <circle cx="10" cy="28" r="3" />
                    <circle cx="20" cy="32" r="3" />
                    <circle cx="30" cy="28" r="3" />
                    <line x1="20" y1="20" x2="10" y2="25" />
                    <line x1="20" y1="20" x2="20" y2="29" />
                    <line x1="20" y1="20" x2="30" y2="25" />
                  </svg>
                </div>
                <h2 className="plan-name">Max</h2>
                <p className="plan-description plan-description-link">Higher limits, priority access</p>
                <div className="plan-price">
                  <span className="price-amount">From $100</span>
                  <span className="price-period">/ month billed monthly</span>
                </div>
                {getPlanButton('max_5x', STRIPE_PRICES.max_5x, 'Get Max plan', true)}
                <div className="plan-divider"></div>
                <div className="plan-features">
                  <p className="features-header">Everything in Pro, plus:</p>
                  <ul className="features-list">
                    <li>Choose 5x or 20x more usage than Pro*</li>
                    <li>Higher output limits for all tasks</li>
                    <li>Early access to advanced Claude features</li>
                    <li>Priority access at high traffic times</li>
                    <li>Includes Claude Code</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {planType === 'team' && (
            <div className="plans-grid">
              {/* Team Plan */}
              <div className="plan-card">
                <div className="plan-icon">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="20" width="24" height="14" rx="1" />
                    <rect x="10" y="22" width="4" height="6" />
                    <rect x="18" y="22" width="4" height="6" />
                    <rect x="26" y="22" width="4" height="6" />
                    <line x1="8" y1="20" x2="8" y2="16" />
                    <line x1="32" y1="20" x2="32" y2="16" />
                    <rect x="6" y="10" width="28" height="6" rx="1" />
                  </svg>
                </div>
                <h2 className="plan-name">Team</h2>
                <p className="plan-description">For small teams of 5 or more</p>
                <button className="plan-btn plan-btn-primary" disabled>Coming soon</button>
                <div className="plan-pricing-details">
                  <div className="pricing-row">
                    <span className="pricing-label">Standard seat</span>
                    <span className="pricing-value">$25</span>
                  </div>
                  <p className="pricing-note">Per seat / month if billed annually. $30/seat if billed monthly.</p>
                  <div className="pricing-row">
                    <span className="pricing-label">Premium seat (more usage*)</span>
                    <span className="pricing-value">$150</span>
                  </div>
                  <p className="pricing-note">Per seat / month</p>
                </div>
                <div className="plan-divider"></div>
                <div className="plan-features">
                  <ul className="features-list">
                    <li>Includes Claude Code</li>
                    <li>Connect Microsoft 365, Slack, and more</li>
                    <li>Enterprise search across your organization</li>
                    <li>Central billing and administration</li>
                    <li>Single sign-on (SSO) and domain capture</li>
                    <li>Admin controls for remote and local connectors</li>
                    <li>Enterprise deployment for the Claude desktop app</li>
                    <li>No model training on your content by default</li>
                  </ul>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="plan-card plan-card-featured">
                <div className="plan-icon">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="10" y="14" width="20" height="22" rx="1" />
                    <rect x="14" y="18" width="4" height="4" />
                    <rect x="22" y="18" width="4" height="4" />
                    <rect x="14" y="26" width="4" height="4" />
                    <rect x="22" y="26" width="4" height="4" />
                    <line x1="20" y1="4" x2="20" y2="14" />
                    <line x1="16" y1="8" x2="24" y2="8" />
                  </svg>
                </div>
                <h2 className="plan-name">Enterprise</h2>
                <p className="plan-description">For large businesses operating at scale</p>
                <button className="plan-btn plan-btn-primary" disabled>Contact sales</button>
                <div className="plan-divider"></div>
                <div className="plan-features">
                  <p className="features-header">Everything in Team, plus:</p>
                  <ul className="features-list">
                    <li>More usage*</li>
                    <li>Enhanced context window</li>
                    <li>Claude Code available with premium seat</li>
                    <li>Google Docs cataloging</li>
                    <li>Role-based access with fine grained permissioning</li>
                    <li>System for Cross-domain Identity Management (SCIM)</li>
                    <li>Audit logs</li>
                    <li>Compliance API for observability and monitoring</li>
                    <li>Custom data retention controls</li>
                    <li>Network-level access control</li>
                    <li>IP allowlisting</li>
                    <li>HIPAA-ready offering available</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <p className="billing-footnote">*Usage limits apply. Prices shown don't include applicable tax.</p>
        </div>
      </div>
    </div>
  );
}

export default UpgradePlan;
