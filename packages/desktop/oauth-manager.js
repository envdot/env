/**
 * OAuth 2.1 Manager for MCP Remote Servers
 *
 * Handles the full OAuth 2.1 + PKCE lifecycle:
 * - Metadata discovery (RFC 9728 + RFC 8414)
 * - Dynamic client registration (RFC 7591)
 * - PKCE generation (S256)
 * - Authorization URL construction
 * - Token exchange and refresh
 * - Secure token storage via electron-store
 */

const crypto = require('crypto');

class OAuthManager {
  constructor(store) {
    this.store = store;
  }

  // ── Discovery ──────────────────────────────────────────────

  /**
   * Discover OAuth metadata for an MCP server.
   * 1. Fetch protected resource metadata from the server origin
   * 2. Fetch authorization server metadata from the auth server
   */
  async discoverAuth(mcpServerUrl) {
    try {
      const url = new URL(mcpServerUrl);
      const origin = url.origin;
      const path = url.pathname;

      // Step 1: Fetch protected resource metadata (RFC 9728)
      let resourceMeta = null;
      const resourceUrls = [
        `${origin}/.well-known/oauth-protected-resource${path}`,
        `${origin}/.well-known/oauth-protected-resource`,
      ];

      for (const metaUrl of resourceUrls) {
        try {
          const res = await fetch(metaUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            resourceMeta = await res.json();
            break;
          }
        } catch (_) { /* try next */ }
      }

      if (!resourceMeta?.authorization_servers?.length) {
        // Fallback: try the server origin as the auth server
        resourceMeta = {
          resource: mcpServerUrl,
          authorization_servers: [origin],
        };
      }

      // Step 2: Fetch authorization server metadata (RFC 8414)
      const authServerUrl = resourceMeta.authorization_servers[0];
      const authOrigin = new URL(authServerUrl).origin;
      const authPath = new URL(authServerUrl).pathname;

      let authMeta = null;
      const authUrls = authPath && authPath !== '/'
        ? [
            `${authOrigin}/.well-known/oauth-authorization-server${authPath}`,
            `${authOrigin}/.well-known/openid-configuration${authPath}`,
            `${authServerUrl}/.well-known/openid-configuration`,
          ]
        : [
            `${authOrigin}/.well-known/oauth-authorization-server`,
            `${authOrigin}/.well-known/openid-configuration`,
          ];

      for (const metaUrl of authUrls) {
        try {
          const res = await fetch(metaUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            authMeta = await res.json();
            break;
          }
        } catch (_) { /* try next */ }
      }

      if (!authMeta?.authorization_endpoint || !authMeta?.token_endpoint) {
        return null;
      }

      return {
        resource: resourceMeta.resource || mcpServerUrl,
        authServer: authServerUrl,
        authorizationEndpoint: authMeta.authorization_endpoint,
        tokenEndpoint: authMeta.token_endpoint,
        registrationEndpoint: authMeta.registration_endpoint || null,
        scopesSupported: authMeta.scopes_supported || resourceMeta.scopes_supported || [],
        codeChallengeMethodsSupported: authMeta.code_challenge_methods_supported || ['S256'],
      };
    } catch (error) {
      console.error('[OAuth] Discovery failed:', error.message);
      return null;
    }
  }

  // ── Dynamic Client Registration ────────────────────────────

  /**
   * Register as an OAuth client (RFC 7591) if the server supports it.
   */
  async registerClient(metadata, redirectUri) {
    if (!metadata.registrationEndpoint) return null;

    try {
      const body = {
        client_name: 'Env Desktop',
        redirect_uris: [redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
      console.log('[OAuth] Registering client at', metadata.registrationEndpoint, 'with redirect', redirectUri);
      const res = await fetch(metadata.registrationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.error(`[OAuth] Client registration failed (${res.status}):`, errBody);
        return null;
      }
      const result = await res.json();
      console.log('[OAuth] Client registered:', { client_id: result.client_id, client_name: result.client_name });
      return result;
    } catch (error) {
      console.error('[OAuth] Client registration failed:', error.message);
      return null;
    }
  }

  // ── PKCE ───────────────────────────────────────────────────

  /**
   * Generate PKCE code_verifier and code_challenge (S256).
   */
  generatePKCE() {
    const verifier = this._base64url(crypto.randomBytes(32));
    const challenge = this._base64url(
      crypto.createHash('sha256').update(verifier).digest()
    );
    return {
      codeVerifier: verifier,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    };
  }

  // ── Authorization URL ──────────────────────────────────────

  /**
   * Build the authorization URL for the user to visit.
   */
  buildAuthUrl(metadata, clientId, pkce, redirectUri, scopes) {
    const state = this._base64url(crypto.randomBytes(16));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
      state,
    });

    if (scopes?.length) {
      params.set('scope', scopes.join(' '));
    }

    if (metadata.resource) {
      params.set('resource', metadata.resource);
    }

    return {
      url: `${metadata.authorizationEndpoint}?${params.toString()}`,
      state,
    };
  }

  // ── Token Exchange ─────────────────────────────────────────

  /**
   * Exchange authorization code for access + refresh tokens.
   */
  async exchangeCode(metadata, clientId, code, codeVerifier, redirectUri) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    if (metadata.resource) {
      body.set('resource', metadata.resource);
    }

    const res = await fetch(metadata.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed (${res.status}): ${text}`);
    }

    return await res.json();
  }

  // ── Token Refresh ──────────────────────────────────────────

  /**
   * Refresh an expired access token using the refresh token.
   */
  async refreshToken(metadata, clientId, refreshToken) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const res = await fetch(metadata.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Token refresh failed (${res.status})`);
    }

    return await res.json();
  }

  // ── Token Storage ──────────────────────────────────────────

  storeTokens(serverId, tokens) {
    this.store.set(`oauth.tokens.${serverId}`, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_in: tokens.expires_in || 3600,
      token_type: tokens.token_type || 'Bearer',
      stored_at: Date.now(),
    });
  }

  getStoredTokens(serverId) {
    return this.store.get(`oauth.tokens.${serverId}`) || null;
  }

  clearTokens(serverId) {
    this.store.delete(`oauth.tokens.${serverId}`);
  }

  isTokenExpired(tokens) {
    if (!tokens?.stored_at || !tokens?.expires_in) return true;
    // 60s buffer before actual expiry
    return Date.now() > tokens.stored_at + (tokens.expires_in * 1000) - 60000;
  }

  // ── Client Registration Storage ────────────────────────────

  storeClientRegistration(authServerOrigin, registration) {
    this.store.set(`oauth.clients.${this._sanitizeKey(authServerOrigin)}`, registration);
  }

  getClientRegistration(authServerOrigin) {
    return this.store.get(`oauth.clients.${this._sanitizeKey(authServerOrigin)}`) || null;
  }

  // ── Metadata Storage ───────────────────────────────────────

  storeMetadata(serverId, metadata) {
    this.store.set(`oauth.metadata.${serverId}`, metadata);
  }

  getStoredMetadata(serverId) {
    return this.store.get(`oauth.metadata.${serverId}`) || null;
  }

  // ── Helpers ────────────────────────────────────────────────

  _base64url(buffer) {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  _sanitizeKey(str) {
    return str.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}

module.exports = OAuthManager;
