# Security FAQ

## General Security

### Is it safe to give you my sportsbook login?

**Short answer: Yes, and here's why:**

1. **We never store your password** - We use your credentials once to establish a secure connection, then immediately delete them. Your password never touches our database.

2. **We can't withdraw your money** - All Nigerian sportsbooks require withdrawals to bank accounts with matching names. Even if we wanted to (we don't), we cannot:
   - Access your bank account
   - Withdraw funds (name verification prevents this)
   - See your banking details
   - Modify withdrawal settings

3. **Read-only access** - We can only VIEW your bet history. We cannot:
   - Place bets for you
   - Change your account settings
   - Access deposit/withdrawal functions
   - See your payment methods

4. **Session-based security** - We store only encrypted session tokens (like when you stay logged in to Gmail), not your actual credentials.

---

### What happens to my sportsbook password?

**Step-by-step breakdown:**

1. You enter your Bet9ja/SportyBet credentials
2. Our system uses them to log in (just like you would)
3. We extract a session token (a temporary access key)
4. **Your password is immediately deleted from our system**
5. We use the session token to fetch your bet history
6. The session token expires after 30 days
7. You re-authenticate to continue automatic syncing

**Technical details:**
- Password exists in our system for less than 10 seconds
- Never written to our database
- Only held in temporary memory during authentication
- Secured with TLS encryption during transmission

---

### What information can you see?

**We CAN see:**
- ✓ Your bet history (stakes, odds, results)
- ✓ Account username/display name
- ✓ Bet timestamps
- ✓ Sport/league information
- ✓ Win/loss records

**We CANNOT see:**
- ✗ Your password (deleted immediately)
- ✗ Bank account details
- ✗ Deposit methods (cards, bank info)
- ✗ Withdrawal information
- ✗ Personal identification (BVN, NIN, etc.)
- ✗ Any financial data beyond bet history

---

### Why can't you withdraw my money even if you tried?

**Nigerian sportsbooks have strict withdrawal protections:**

1. **Name Verification**: Withdrawals must go to a bank account with the EXACT same name as your betting account
   - Your Bet9ja name: Chukwu Okafor
   - Bank account must be: Chukwu Okafor
   - If names don't match → withdrawal rejected

2. **We never see your bank details** - Your bank account number, BVN, and banking info are completely separate from bet history

3. **Withdrawal passwords** - Many sportsbooks require a separate withdrawal PIN/password that we never access

4. **SMS verification** - Most sportsbooks send OTP to your phone for withdrawals

**Bottom line**: Even with access to your betting account, we cannot move money. The sportsbooks themselves prevent this.

---

### What if I change my mind later?

You have complete control:

**Immediately:**
- Change your sportsbook password → our connection breaks instantly
- Disconnect in our app → we delete all session tokens
- Delete your account → all data removed within 90 days

**No questions asked. No penalties.**

---

## Technical Security

### How do you encrypt my data?

**Multi-layer security:**

1. **In Transit (Your Device → Our Servers)**:
   - TLS 1.3 encryption (same as online banking)
   - 256-bit encryption keys
   - Certificate pinning to prevent man-in-the-middle attacks

2. **At Rest (Stored on Our Servers)**:
   - AES-256 encryption for session tokens
   - Database encryption
   - Encrypted backups

3. **Session Tokens**:
   - Industry-standard encryption
   - Unique encryption key per user
   - Keys rotated regularly

---

### What happens if you get hacked?

**Our protection layers:**

1. **Defense in depth**: Multiple security layers; breaching one doesn't compromise everything

2. **What attackers would NOT get**:
   - Your sportsbook passwords (we don't have them)
   - Your banking information (we never see it)
   - Plaintext session tokens (encrypted with unique keys)

3. **What attackers MIGHT access**:
   - Encrypted session tokens (useless without decryption keys)
   - Your betting history (already visible on sportsbook sites)
   - Account email addresses

4. **Immediate response**:
   - Instant user notification
   - Force password reset on all accounts
   - Revoke all session tokens
   - Public disclosure within 72 hours

5. **Limited damage window**: Session tokens expire in 30 days anyway

---

### How is this different from storing passwords?

**Traditional (BAD) approach:**
```
User enters password → Store in database → Use anytime
Problem: One breach = all passwords stolen forever
```

**Our (GOOD) approach:**
```
User enters password → Use once → Delete immediately → Store only session token
Session token expires in 30 days → User re-authenticates
Problem solved: Even if breached, attacker gets temporary tokens, not passwords
```

**Real-world analogy:**
- Storing passwords = Keeping a copy of your house key forever
- Our method = Getting a temporary hotel room card that expires

---

### Do you comply with Nigerian data protection laws?

**Yes. We comply with:**

1. **Nigeria Data Protection Regulation (NDPR), 2019**:
   - Lawful data collection with consent
   - Data minimization (collect only what's needed)
   - Purpose limitation (use data only for stated purpose)
   - User rights (access, correction, deletion)

2. **Your NDPR Rights**:
   - Right to access your data
   - Right to correct inaccuracies
   - Right to delete your account
   - Right to data portability (export as CSV)
   - Right to withdraw consent

3. **Data Protection Officer**: Available at [dpo-email@domain.com]

---

### Can my sportsbook see that I'm using your app?

**What they see:**
- A normal login from your device
- Regular API requests for bet history (like when you check your account on their website)

**What they don't see:**
- That it's automated
- That you're using a third-party tool

**Note**: Some sportsbooks' terms of service prohibit automated access or third-party tools. While unlikely to be enforced for read-only betting history, you should be aware of this risk. We recommend reviewing your sportsbook's terms.

---

## Account Security

### How do I make my account more secure?

**Best practices:**

1. **Use a strong password** for YOUR BetTrackr account
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a password manager (1Password, LastPass, Bitwarden)

2. **Enable two-factor authentication (2FA)** (coming soon)
   - Extra security layer for your BetTrackr account
   - Even if someone steals your password, they can't log in

3. **Use different passwords** for each service
   - Don't reuse your sportsbook password for our app
   - Don't reuse our app password for sportsbooks

4. **Log out on shared devices**
   - Always log out on public computers
   - Use private browsing for sensitive actions

5. **Monitor your account**
   - Check login activity regularly
   - Report suspicious activity immediately

---

### What if someone accesses my BetTrackr account?

**Worst case scenario:**

**What they CAN do:**
- View your betting statistics
- See your bet history
- Export your data

**What they CANNOT do:**
- Access your sportsbook accounts directly (no passwords stored)
- Place bets
- Withdraw money
- See your banking information
- Change your sportsbook credentials

**If compromised:**
1. Change your BetTrackr password immediately
2. Disconnect all sportsbooks
3. Change your sportsbook passwords (as precaution)
4. Contact our support

---

### Do you ever ask for my password via email or phone?

**NEVER.** This is critical:

- ❌ We will NEVER ask for your password via email
- ❌ We will NEVER ask for your password via phone call
- ❌ We will NEVER ask for your password via WhatsApp/SMS
- ✓ You ONLY enter passwords directly in our app interface

**If someone claiming to be us asks for your password, it's a scam. Report it immediately.**

---

## Session Management

### What is a session token?

**Simple explanation:**

When you log in to any website (Gmail, Facebook, Netflix), you don't re-enter your password every time you refresh the page. Instead, the site gives you a "session token" – a temporary key that says "this person already logged in."

**Our process:**
1. You give us your Bet9ja password once
2. We log in and get a session token from Bet9ja
3. We delete your password
4. We use the session token to check your bets automatically
5. Token expires after 30 days → you re-authenticate

**Benefits:**
- We never store passwords
- If our database is breached, attackers get temporary tokens, not passwords
- Tokens expire automatically
- You stay in control

---

### How often do I need to re-enter my password?

**Every 30 days** (approximately):

- Session tokens from Bet9ja/SportyBet expire after ~30 days
- When expired, you'll see: "Reconnect your Bet9ja account"
- Simply re-enter your credentials → good for another 30 days

**Why 30 days?**
- Security: Limits exposure if session token is compromised
- Balance: Not too frequent (annoying) or too rare (risky)
- Automatic: You'll get a notification when it's time

---

### Can I revoke access immediately?

**Yes, multiple ways:**

1. **In our app**: Settings → Connected Accounts → Disconnect
   - Takes effect instantly
   - We delete session tokens immediately

2. **Change sportsbook password**:
   - Go to Bet9ja → Change password
   - Our session token becomes invalid instantly
   - Connection automatically breaks

3. **Delete account**:
   - Settings → Delete Account
   - All data removed within 90 days
   - All connections severed immediately

**No waiting period. No questions. Instant control.**

---

## Comparison to Other Services

### How is this like Mono (the bank statement connector)?

**Similarities:**
- Both connect to financial accounts using credentials
- Both use session-based authentication (not password storage)
- Both provide read-only access
- Both are compliant with Nigerian data regulations

**Key difference:**
- **Mono**: Higher stakes (bank account access, full financial data)
- **Us**: Lower stakes (bet history only, can't access money)

**If you trust Mono with your bank account, you can definitely trust us with your betting history.**

---

### How do I know you're legitimate and not a scam?

**Verify before trusting:**

1. **Check our website**: https://bettrackr.com
   - Look for HTTPS (padlock icon)
   - Verify spelling (scammers use fake domains)

2. **Social proof**:
   - Read reviews from real users
   - Check our social media presence
   - Look for testimonials

3. **Transparency**:
   - We openly explain how we work
   - We publish security documentation
   - We have real contact information

4. **Start small**:
   - Try free tier first
   - Connect one sportsbook
   - See how it works before upgrading

5. **Red flags of scams** (we don't do these):
   - Asking for passwords via email/SMS
   - Requesting bank account details
   - Promising guaranteed wins
   - Too-good-to-be-true offers
   - No contact information
   - Pressure to act immediately

---

## Troubleshooting

### My connection keeps failing. What's wrong?

**Common causes:**

1. **Incorrect credentials**:
   - Double-check username/password
   - Caps lock on?
   - Try logging into the sportsbook directly first

2. **Sportsbook website is down**:
   - Check if Bet9ja.com is accessible
   - Try again in 30 minutes

3. **Session expired**:
   - 30 days have passed
   - Simply reconnect with fresh credentials

4. **Account locked/suspended**:
   - Your sportsbook account may be restricted
   - Contact sportsbook support

5. **Sportsbook changed their system**:
   - We're working on a fix (usually 24-48 hours)
   - Check our status page or Twitter for updates

---

### Can sportsbooks ban me for using this?

**Unlikely, but possible:**

**Why unlikely:**
- We use read-only access (no betting/withdrawing)
- We simulate normal user behavior
- Thousands of users with no bans reported

**Theoretical risk:**
- Some sportsbook terms prohibit "automated access"
- In practice, rarely enforced for analytics tools
- More concerned about betting bots (we're not that)

**Our recommendation:**
- Risk is minimal for personal analytics use
- Don't publicize your use of automation tools
- Review your sportsbook's specific terms

**We've never had a user report being banned for using our service.**

---

### What happens if BetTrackr shuts down?

**Your data:**
- Export all betting history as CSV before we close
- 90-day notice before shutdown (if possible)
- You keep access to your sportsbook accounts (they're yours)

**Your money:**
- Your sportsbook funds are unaffected (separate accounts)
- We never hold your money

**Refunds:**
- Prorated refunds for unused subscription time
- Processed within 30 days of shutdown announcement

---

## Contact & Support

### I have a security concern. Who do I contact?

**For security issues:**
- **Email**: security@bettrackr.com
- **Response time**: Within 24 hours for critical issues

**For suspected vulnerabilities:**
- Bug bounty program: Up to ₦50,000 for valid security findings
- Responsible disclosure: Report privately before public disclosure

**For general questions:**
- **Email**: support@bettrackr.com
- **Twitter**: @bettrackr
- **WhatsApp**: [your-number] (business hours)

---

### How do I report suspicious activity?

**If you notice:**
- Logins from unknown devices
- Changes you didn't make
- Suspicious emails claiming to be us

**Report immediately:**
1. Change your password
2. Email: security@bettrackr.com
3. We'll investigate within 24 hours

**We take security seriously. Every report is investigated.**

---

## Still Have Questions?

If your question isn't answered here:
- Email: support@bettrackr.com
- Live chat: Available on our website (Mon-Sat, 9 AM - 6 PM WAT)
- FAQ: bettrackr.com/faq

**We're here to help. Your security is our priority.**
