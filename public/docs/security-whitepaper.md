# Security Whitepaper
## BetTrackr - Technical Security Architecture

**Version 1.0**  
**Last Updated: February 24, 2026**  
**Document Type: Public**

---

## Executive Summary

BetTrackr is a sports betting analytics platform that connects to Nigerian sportsbook accounts to provide users with comprehensive betting performance insights. This whitepaper details our security architecture, data handling practices, and compliance measures.

**Key Security Principles:**
- **Zero Password Storage**: Sportsbook credentials are never persisted
- **Session-Based Authentication**: Temporary, encrypted tokens replace password storage
- **Read-Only Access**: No ability to place bets or withdraw funds
- **Defense in Depth**: Multiple layers of security controls
- **Privacy by Design**: Minimal data collection and retention
- **Compliance**: NDPR-compliant data handling

---

## 1. System Architecture

### 1.1 High-Level Overview
```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   User's    │         │   BetTrackr      │         │   Sportsbook    │
│   Device    │◄───────►│     Platform     │◄───────►│   (Bet9ja,      │
│             │  HTTPS  │                  │  HTTPS  │   SportyBet)    │
└─────────────┘         └──────────────────┘         └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    Encrypted     │
                        │    Database      │
                        │  (PostgreSQL)    │
                        └──────────────────┘
```

**Components:**
- **Frontend**: React-based web application (PWA)
- **Backend**: Node.js API server
- **Database**: PostgreSQL with encryption at rest
- **Authentication**: JWT-based session management
- **Infrastructure**: Cloud hosting with VPS (8GB RAM, 250GB storage)

---

### 1.2 Data Flow

#### Initial Authentication Flow:
1. User enters sportsbook credentials in app
2. Credentials sent over TLS 1.3 to backend
3. Backend uses Playwright to authenticate with sportsbook
4. Session cookies/tokens extracted from sportsbook
5. Sportsbook credentials DELETED from memory
6. Session tokens encrypted with AES-256
7. Encrypted tokens stored in database
8. Bet history fetched and stored
9. User sees analytics dashboard

#### Subsequent Syncs (Automatic):
1. Cron job triggers daily sync
2. Retrieve encrypted session token from database
3. Decrypt token in memory
4. Use token to fetch latest bets via Axios requests
5. Append new bets to user's history
6. Token remains encrypted in database
7. User sees updated analytics

#### Session Expiration:
1. After ~30 days, sportsbook session expires
2. Next sync attempt fails with authentication error
3. User notified: "Reconnect your account"
4. User re-authenticates (repeat Initial Authentication Flow)

---

## 2. Credential Handling

### 2.1 Password Policy

**Sportsbook Passwords:**
- **Never stored** in any persistent storage
- Exists in memory for <10 seconds during authentication
- Transmitted only over TLS-encrypted connections
- Immediately destroyed after session token extraction
- Never logged or written to disk

**User Account Passwords:**
- Hashed using bcrypt (12 rounds)
- Salted with unique per-user salt
- Never stored in plaintext
- Never visible to administrators

---

### 2.2 Session Token Management

**Token Acquisition:**
```javascript
// Pseudocode (actual implementation varies)
async function authenticateSportsbook(username, password) {
  const browser = await playwright.launch();
  const page = await browser.newPage();
  
  // Navigate to sportsbook login
  await page.goto('https://bet9ja.com/login');
  
  // Enter credentials
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('#login-button');
  
  // Extract session cookies
  const cookies = await page.context().cookies();
  const sessionToken = extractSessionToken(cookies);
  
  // CRITICAL: Close browser and clear memory
  await browser.close();
  
  // Delete credentials from memory
  username = null;
  password = null;
  
  // Encrypt and store session token
  const encryptedToken = encryptAES256(sessionToken, userKey);
  await database.saveToken(userId, encryptedToken);
  
  return { success: true };
}
```

**Token Storage:**
- Encrypted using AES-256-CBC
- Unique encryption key per user (derived from master key + user ID)
- Stored in database with expiration timestamp
- Master encryption keys stored in environment variables (not in code)

**Token Usage:**
```javascript
async function fetchBets(userId) {
  // Retrieve encrypted token
  const encryptedToken = await database.getToken(userId);
  
  // Decrypt in memory only
  const sessionToken = decryptAES256(encryptedToken, userKey);
  
  // Use with Axios to fetch bets
  const response = await axios.get('https://bet9ja.com/api/bet-history', {
    headers: { 'Cookie': sessionToken }
  });
  
  // Clear token from memory after use
  sessionToken = null;
  
  return response.data;
}
```

**Token Expiration:**
- Tokens typically valid for 30 days
- Expiration tracked in database
- Automatic cleanup of expired tokens
- User notified 3 days before expiration

---

### 2.3 Why We Can't Withdraw Funds

**Technical Limitations (Our Protection):**

1. **Name Verification Requirement:**
   - All Nigerian sportsbooks require withdrawal destination bank account name to match betting account name exactly
   - We never collect bank account information
   - Even with account access, we cannot withdraw without user's bank details

2. **Separate Withdrawal Credentials:**
   - Many sportsbooks require additional withdrawal PIN/password
   - We don't capture these during authentication

3. **SMS/Email OTP Verification:**
   - Most sportsbooks send one-time passwords to user's phone/email for withdrawals
   - We cannot intercept these

4. **Read-Only API Access:**
   - We use endpoints designed for viewing history
   - Betting/withdrawal endpoints require different authentication

5. **Rate Limiting:**
   - Sportsbooks rate-limit withdrawal requests
   - Suspicious activity triggers account lockouts

**Practical Reality:** We are an analytics tool, not a betting platform. We have no infrastructure for handling withdrawals, no banking partnerships, and no reason to access funds.

---

## 3. Encryption & Data Security

### 3.1 Encryption in Transit

**TLS Configuration:**
- **Protocol**: TLS 1.3 (TLS 1.2 minimum)
- **Cipher Suites**: AES-256-GCM preferred
- **Certificate**: Let's Encrypt SSL certificate (auto-renewed)
- **HSTS**: Strict-Transport-Security header enabled
- **Certificate Pinning**: Implemented in mobile apps (future)

**API Security:**
- All API endpoints require HTTPS
- HTTP requests automatically redirect to HTTPS
- API keys transmitted only in headers (never in URL parameters)

---

### 3.2 Encryption at Rest

**Database Encryption:**
- **Session Tokens**: AES-256-CBC encryption
- **Betting Data**: Encrypted at database level (PostgreSQL transparent data encryption)
- **Backups**: Encrypted before upload to backup storage

**Encryption Keys:**
- Master key stored in environment variables
- Rotated quarterly
- User-specific derived keys (PBKDF2 with 100,000 iterations)
- Keys never hard-coded in application

**Key Management:**
```
Master Key (environment variable)
    ↓
User Derivation Key (PBKDF2)
    ↓
User-Specific Session Token Encryption Key
```

---

### 3.3 Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Sportsbook passwords | 0 seconds (never stored) | N/A |
| Session tokens | 30 days or until revoked | Overwritten with random data |
| Betting history | While account active + 90 days | Permanent deletion from database |
| Account information | Until account deletion | Permanent deletion + backup purge |
| Logs (without PII) | 12 months | Automatic rotation |

**Account Deletion Process:**
1. User requests deletion
2. Immediate logout and token revocation
3. 7-day grace period (optional recovery)
4. After 7 days: All data permanently deleted
5. Backups purged within 90 days

---

## 4. Access Control

### 4.1 User Authentication

**Multi-Factor Authentication (Coming Soon):**
- Time-based One-Time Password (TOTP)
- SMS backup codes
- Optional for free tier, required for Pro tier

**Session Management:**
- JWT tokens with 7-day expiration
- Refresh tokens with 30-day expiration
- Automatic logout on suspicious activity
- Device fingerprinting for anomaly detection

---

### 4.2 Administrative Access

**Principle of Least Privilege:**
- Developers have no access to production database
- Database access requires VPN + 2FA
- All admin actions logged and auditable
- Separate staging environment for testing

**Access Roles:**
| Role | Permissions | Access Level |
|------|-------------|--------------|
| Super Admin | Full system access | 1 person (Founder) |
| Developer | Code deployment, logs (no DB) | 0-2 people |
| Support | View user issues (no credentials) | 0-1 person |

**Access Logging:**
- All database queries logged
- Admin actions audit trail
- Failed login attempts tracked
- Alerts for unusual access patterns

---

## 5. Infrastructure Security

### 5.1 Hosting Environment

**VPS Configuration:**
- **Provider**: [Your Hosting Provider]
- **Location**: [Data Center Location]
- **Specs**: 8GB RAM, 250GB storage, 20GB bandwidth
- **OS**: Ubuntu 24.04 LTS (hardened)

**Server Hardening:**
- SSH key-only authentication (password auth disabled)
- Firewall configured (UFW): Only ports 80, 443, 22 open
- Automatic security updates enabled
- Fail2ban for brute-force protection
- Regular security patching schedule

---

### 5.2 Application Security

**Dependency Management:**
- Weekly npm audit for vulnerabilities
- Automated Dependabot alerts
- Critical security patches applied within 48 hours

**Code Security:**
- No secrets in code (environment variables only)
- Input validation and sanitization
- Prepared statements (SQL injection prevention)
- XSS protection headers
- CSRF tokens for state-changing operations

**Rate Limiting:**
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| Login | 5 attempts/15 min | Prevent brute force |
| Account creation | 3 accounts/IP/day | Prevent spam |
| API requests | 100 requests/min | Prevent abuse |
| Sportsbook sync | 1 sync/user/hour | Respect sportsbook limits |

---

### 5.3 Monitoring & Logging

**Application Monitoring:**
- Uptime monitoring (99% SLA target)
- Error tracking (Sentry or similar)
- Performance monitoring (response times)
- Resource usage alerts

**Security Monitoring:**
- Failed login attempt tracking
- Unusual API usage patterns
- Database access anomalies
- Automated alerts for suspicious activity

**Logs:**
- Application logs (errors, warnings, info)
- Access logs (without sensitive data)
- Audit logs (admin actions)
- No logging of passwords or session tokens

---

## 6. Third-Party Integrations

### 6.1 Payment Processing

**Provider**: Paystack

**Security:**
- PCI DSS Level 1 compliant (Paystack's responsibility)
- We never store credit card numbers
- We store only: Paystack customer ID, subscription status
- Webhook signature verification for payment notifications

---

### 6.2 Sportsbook Integrations

**Supported Sportsbooks:**
- Bet9ja
- SportyBet
- 1xBet
- [Others as added]

**Integration Method:**
- Web scraping via Playwright (no official API available)
- Read-only access to bet history endpoints
- Proxies used for geo-restricted sportsbooks
- Rate limiting to avoid detection/blocking

**Risks & Mitigations:**
| Risk | Mitigation |
|------|-----------|
| Sportsbook changes website | Monitoring + 24-48hr fix SLA |
| Account flagged for automation | User awareness + terms clarification |
| Session expires unexpectedly | Graceful error handling + re-auth prompt |

---

## 7. Incident Response

### 7.1 Security Incident Response Plan

**Severity Levels:**

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| Critical | Active breach, data exposed | Immediate (< 1 hour) | Database hack, password leak |
| High | Potential breach, vulnerability found | 4 hours | Unpatched critical CVE |
| Medium | Security concern, no breach | 24 hours | Suspicious login pattern |
| Low | Minor issue, no user impact | 48 hours | Non-critical vulnerability |

**Response Process:**
1. **Detection**: Automated alerts + user reports
2. **Assessment**: Determine severity and scope
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat/patch vulnerability
5. **Recovery**: Restore normal operations
6. **Communication**: Notify affected users
7. **Post-Mortem**: Document lessons learned

---

### 7.2 Data Breach Protocol

**Immediate Actions (< 1 Hour):**
- Isolate compromised systems
- Revoke all session tokens
- Force password reset for all users
- Disable new account creation temporarily

**Short-Term (< 24 Hours):**
- Assess data exposure scope
- Notify Nigerian Data Protection Bureau (NDPB) if required
- Begin user notification process
- Engage external security firm (if needed)

**Communication:**
- Email all users within 72 hours (NDPR requirement)
- Public disclosure on website
- Transparent incident report
- Offer free credit monitoring (if payment data exposed)

---

### 7.3 User Notification

**What We Tell You:**
- What happened (clear, non-technical explanation)
- What data was affected
- What we're doing about it
- What you should do (change passwords, etc.)
- How to contact us with questions

**What We Don't Do:**
- Minimize the incident
- Delay notification
- Hide details
- Blame users

---

## 8. Compliance & Standards

### 8.1 Nigeria Data Protection Regulation (NDPR) Compliance

**Key Requirements:**

| NDPR Principle | Our Implementation |
|----------------|-------------------|
| Lawful Processing | Explicit user consent during signup |
| Purpose Limitation | Data used only for analytics |
| Data Minimization | Collect only bet history (not banking info) |
| Accuracy | Users can update account info anytime |
| Storage Limitation | 90-day retention after account deletion |
| Security | Encryption, access controls, monitoring |
| Accountability | DPO appointed, audit trails maintained |

**User Rights:**
- ✓ Right to access data (export as CSV)
- ✓ Right to rectification (edit account info)
- ✓ Right to erasure (delete account)
- ✓ Right to data portability (export)
- ✓ Right to object (opt-out of marketing)
- ✓ Right to withdraw consent (disconnect sportsbooks)

**Data Protection Officer:**
- Email: dpo@bettrackr.com
- Responds to privacy inquiries within 30 days (NDPR requirement)

---

### 8.2 Industry Best Practices

**Frameworks We Follow:**
- OWASP Top 10 (Web Application Security)
- NIST Cybersecurity Framework
- CIS Critical Security Controls
- PCI DSS principles (though not required for us)

**Future Certifications (Roadmap):**
- ISO 27001 (Information Security Management)
- SOC 2 Type II (if pursuing enterprise clients)

---

## 9. Responsible Disclosure

### 9.1 Bug Bounty Program

We encourage security researchers to report vulnerabilities responsibly.

**Scope:**
- ✓ Our web application (bettrackr.com)
- ✓ API endpoints (api.bettrackr.com)
- ✓ Mobile apps (if/when launched)
- ✗ Social engineering attacks
- ✗ Physical security issues
- ✗ Third-party services (Paystack, hosting provider)

**Rewards:**
| Severity | Bounty (NGN) | Examples |
|----------|--------------|----------|
| Critical | 50,000 | Remote code execution, database access |
| High | 25,000 | Authentication bypass, data exposure |
| Medium | 10,000 | XSS, CSRF, information disclosure |
| Low | 5,000 | Minor vulnerabilities, best practice violations |

**How to Report:**
1. Email: security@bettrackr.com
2. Include: Vulnerability description, reproduction steps, impact assessment
3. Wait for confirmation (we respond within 48 hours)
4. Do NOT publicly disclose until we've fixed it (90-day disclosure window)

**Safe Harbor:**
We will not pursue legal action against security researchers who:
- Report in good faith
- Don't exploit vulnerabilities beyond proof-of-concept
- Don't access/download user data unnecessarily
- Follow coordinated disclosure practices

---

## 10. Future Security Roadmap

### 10.1 Short-Term (Next 6 Months)

- [ ] Implement 2FA for all users
- [ ] Add device fingerprinting for anomaly detection
- [ ] Conduct external security audit
- [ ] Launch bug bounty program
- [ ] Implement automated vulnerability scanning

### 10.2 Long-Term (12-18 Months)

- [ ] Pursue ISO 27001 certification
- [ ] Implement hardware security module (HSM) for key management
- [ ] Add biometric authentication (mobile apps)
- [ ] Build security operations center (SOC)
- [ ] Achieve SOC 2 Type II compliance

---

## 11. Contact Information

**General Inquiries:**
- Email: security@bettrackr.com
- Website: https://bettrackr.com/security

**Security Issues:**
- Email: security@bettrackr.com
- PGP Key: [Your PGP Public Key] (for sensitive reports)

**Data Protection:**
- Email: dpo@bettrackr.com
- Phone: [Your Contact Number]

**Incident Reporting:**
- 24/7 Hotline: [Emergency Number] (Critical incidents only)

---

## 12. Document Control

**Version History:**

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Feb 24, 2026 | Initial release | Antigravity |

**Review Schedule:**
- Quarterly review (or after major security incidents)
- Annual comprehensive update

**Distribution:**
- Public document available at: bettrackr.com/security-whitepaper

---

## Appendix A: Security Glossary

**AES-256**: Advanced Encryption Standard with 256-bit keys (military-grade encryption)

**Bcrypt**: Password hashing algorithm designed to be slow (prevents brute-force)

**JWT (JSON Web Token)**: Standard for securely transmitting information between parties

**NDPR**: Nigeria Data Protection Regulation (2019)

**OWASP**: Open Web Application Security Project

**PCI DSS**: Payment Card Industry Data Security Standard

**Session Token**: Temporary credential used instead of password for authenticated requests

**TLS (Transport Layer Security)**: Protocol for encrypted communication over networks

**2FA (Two-Factor Authentication)**: Security process requiring two forms of identification

---

## Appendix B: Technical Stack

**Frontend:**
- React 18
- TypeScript
- Tailwind CSS
- React Query (data fetching)

**Backend:**
- Node.js (v20 LTS)
- Express.js
- PostgreSQL 16
- Playwright (sportsbook automation)
- Axios (API requests)

**Infrastructure:**
- Ubuntu 24.04 LTS
- Nginx (reverse proxy)
- PM2 (process manager)
- Let's Encrypt (SSL)

**Monitoring:**
- [Your monitoring tool]
- Error tracking
- Uptime monitoring

---

**END OF WHITEPAPER**
