import React from 'react';
import { Link } from 'react-router-dom';
import './FooterLinks.css';

const FooterLinks = () => {
    return (
        <footer className="footer-links">
            <div className="footer-content">
                <Link to="/docs/about">About</Link>
                <Link to="/docs/privacy-policy">Privacy Policy</Link>
                <Link to="/docs/terms-of-service">Terms</Link>
                <Link to="/docs/security-faq">Security FAQ</Link>
            </div>
            <div className="footer-copyright">
                © 2026 BetTrackr. Built for Nigeria.
            </div>
        </footer>
    );
};

export default FooterLinks;
