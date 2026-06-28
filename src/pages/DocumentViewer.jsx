import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft } from 'react-icons/fa';
import './DocumentViewer.css';

const DocumentViewer = () => {
    const { docName } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/docs/${docName}.md`);
                if (!response.ok) throw new Error('Document not found');
                const text = await response.text();
                setContent(text);
            } catch (err) {
                setContent('# Error\nDocument not found.');
            } finally {
                setLoading(false);
            }
        };

        fetchDoc();
    }, [docName]);

    return (
        <div className="document-container">
            <header className="document-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <FaArrowLeft />
                </button>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} id="logo">
                    <img style={{ height: "24px", marginRight: "7px", width: "24px" }} src="/assets/dice.png" alt="BetTrackr" />
                    <span style={{ fontWeight: 600, color: "#707070", fontSize: "1.1rem" }}>BetTrackr</span>
                </div>
                <div style={{ width: '40px' }} /> {/* Spacer */}
            </header>

            <main className="document-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <div className="markdown-body">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DocumentViewer;
