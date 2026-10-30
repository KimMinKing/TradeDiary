import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateLanguage, updateNickname } from '../api/userApi';
import useTheme from '../hooks/useTheme';
import { useLocale } from '../i18n/localeContext';
import './ProfileQuickMenu.css';

const ProfileQuickMenu = ({ profile, onProfileChange, onClose, onLogout }) => {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { language, t } = useLocale();

  const selectLanguage = async nextLanguage => {
    if (nextLanguage === language) return;
    const previous = language;
    localStorage.setItem('preferredLanguage', nextLanguage);
    window.dispatchEvent(new CustomEvent('languageChange', { detail: nextLanguage }));
    try { await updateLanguage(nextLanguage); }
    catch {
      localStorage.setItem('preferredLanguage', previous);
      window.dispatchEvent(new CustomEvent('languageChange', { detail: previous }));
      setMessage(previous === 'ko' ? '언어 설정을 저장하지 못했습니다.' : 'Could not save the language preference.');
    }
  };

  useEffect(() => {
    const outside = event => { if (menuRef.current && !menuRef.current.contains(event.target)) onClose(); };
    const escape = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [onClose]);

  const save = async event => {
    event.preventDefault();
    const value = nickname.trim();
    if (value.length < 2 || value.length > 20 || value === profile.nickname) return;
    setSaving(true); setMessage('');
    try {
      await updateNickname(value);
      const next = { ...profile, nickname: value };
      onProfileChange(next); window.dispatchEvent(new CustomEvent('profileUpdated', { detail: next }));
      setMessage('Saved');
    } catch { setMessage('Could not save'); }
    finally { setSaving(false); }
  };

  return <aside className="profile-quick" ref={menuRef}>
    <header><span>QUICK PROFILE</span><button onClick={onClose}>×</button></header>
    <div className="profile-identity"><div>{profile.avatar ? <img src={profile.avatar} alt="" /> : (profile.nickname?.[0] || 'T')}</div><span><strong>{profile.nickname || 'Trader'}</strong><small>Personal workspace</small></span></div>
    <form onSubmit={save}><label htmlFor="quick-nickname">Display name</label><div><input id="quick-nickname" maxLength="20" value={nickname} onChange={event => setNickname(event.target.value)} /><button disabled={saving}>{saving ? '...' : 'Save'}</button></div>{message && <small>{message}</small>}</form>
    <div className="profile-quick-row"><span><b>Appearance</b><small>Current theme: {theme}</small></span><button onClick={toggleTheme}>{theme === 'dark' ? 'Use light' : 'Use dark'}</button></div>
    <div className="profile-quick-row"><span><b>{t('Language')}</b><small>{language === 'ko' ? '한국어' : 'English'}</small></span><div className="profile-language-switch" role="group" aria-label={t('Language')}><button className={language === 'en' ? 'active' : ''} onClick={() => selectLanguage('en')}>EN</button><button className={language === 'ko' ? 'active' : ''} onClick={() => selectLanguage('ko')}>한국어</button></div></div>
    <div className="profile-quick-links"><button onClick={() => { navigate('/settings?tab=profile'); onClose(); }}>Account details <span>→</span></button><button onClick={() => { navigate('/settings?tab=connections'); onClose(); }}>Exchange connections <span>→</span></button><button onClick={() => { navigate('/settings?tab=preferences'); onClose(); }}>Advanced settings <span>→</span></button></div>
    <button className="profile-signout" onClick={onLogout}>Sign out</button>
  </aside>;
};

export default ProfileQuickMenu;
