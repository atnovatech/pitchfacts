import React, { useState, useEffect } from 'react';
import { t } from '../i18n';

export default function EmailSubscribe({ language }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('pf_subscribed') === 'true'
  );

  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => setShow(true), 35000);
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) setShow(true);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [dismissed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    localStorage.setItem('pf_subscribed', 'true');
    if (window.gtag) window.gtag('event', 'newsletter_subscribe', {
      email_domain: email.split('@')[1]
    });
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pf_subscribed', 'true');
  };

  if (!show || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '320px',
      background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
      border: '1px solid #333',
      borderRadius: '16px',
      padding: '20px',
      zIndex: 999,
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.4s ease',
    }}>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'none', border: 'none', color: '#555',
          cursor: 'pointer', fontSize: '18px',
        }}
      >×</button>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎉</div>
          <div style={{ fontWeight: '700', color: '#00c851', marginBottom: '5px' }}>
            You're subscribed!
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            First insights land in your inbox this Friday ⚽
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '18px', marginBottom: '5px' }}>⚽</div>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px', color: '#fff' }}>
            {t(language, 'subscribe')}
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
            {t(language, 'subscribeDesc')}
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t(language, 'yourEmail')}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#0f0f0f',
                color: '#fff',
                fontSize: '13px',
                marginBottom: '10px',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              {t(language, 'subscribe_btn')}
            </button>
          </form>
          <div style={{ fontSize: '10px', color: '#444', marginTop: '10px', textAlign: 'center' }}>
            No spam. Unsubscribe anytime.
          </div>
        </>
      )}
    </div>
  );
}