// [파일 용도] 프로필 아바타 클릭 시 열리는 설정 드롭다운 패널

import { useState, useEffect, useRef } from 'react';
import { getMe, updateNickname, updatePassword, updateAvatar } from '../api/userApi';

const SYNC_OPTIONS = [
  { value: 30,  label: '30초' },
  { value: 60,  label: '1분' },
  { value: 300, label: '5분' },
  { value: 0,   label: 'OFF' },
];

const INTERVAL_KEY = 'autoSyncInterval';

// [컴포넌트] 프로필 설정 드롭다운 패널 / [호출] Navbar.jsx
const SettingsPanel = ({ onClose }) => {
  const panelRef = useRef(null);

  const [userInfo, setUserInfo]   = useState({ email: '', nickname: '' });
  const [activeSection, setActiveSection] = useState(null); // 'nickname' | 'password' | 'sync'

  // 닉네임 변경 폼
  const [newNickname, setNewNickname]   = useState('');
  const [nicknameMsg, setNicknameMsg]   = useState({ text: '', ok: false });
  const [savingNick, setSavingNick]     = useState(false);

  // 비밀번호 변경 폼
  const [curPassword,  setCurPassword]  = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [passwordMsg,  setPasswordMsg]  = useState({ text: '', ok: false });
  const [savingPw,     setSavingPw]     = useState(false);

  // 자동 동기화 주기
  const [syncInterval, setSyncInterval] = useState(
    () => parseInt(localStorage.getItem(INTERVAL_KEY) || '60', 10)
  );

  // [용도] 사용자 정보 로드 / [호출] 마운트 시
  useEffect(() => {
    getMe().then((res) => {
      setUserInfo(res.data);
      setNewNickname(res.data.nickname || '');
    }).catch(() => {});
  }, []);

  // [용도] 패널 외부 클릭 시 닫기 (아바타 버튼 제외) / [호출] mousedown 이벤트
  useEffect(() => {
    const handleClick = (e) => {
      if (!panelRef.current) return;
      // 패널 안 클릭이면 무시
      if (panelRef.current.contains(e.target)) return;
      // 아바타 버튼 클릭이면 무시 (버튼 자체 onClick이 토글 처리)
      if (e.target.closest('.avatar-btn')) return;
      onClose();
    };
    // setTimeout으로 등록 — 현재 클릭 이벤트(패널 오픈 클릭)가 끝난 뒤 리스너 활성화
    const tid = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // [용도] 닉네임 저장 / [호출] 닉네임 폼 submit
  const handleNicknameSave = async (e) => {
    e.preventDefault();
    if (!newNickname.trim() || newNickname.length < 2) {
      setNicknameMsg({ text: '2자 이상 입력해주세요.', ok: false });
      return;
    }
    setSavingNick(true);
    setNicknameMsg({ text: '', ok: false });
    try {
      await updateNickname(newNickname.trim());
      setUserInfo((prev) => ({ ...prev, nickname: newNickname.trim() }));
      setNicknameMsg({ text: '닉네임이 변경되었습니다.', ok: true });
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { nickname: newNickname.trim() } }));
    } catch {
      setNicknameMsg({ text: '변경에 실패했습니다.', ok: false });
    } finally {
      setSavingNick(false);
    }
  };

  // [용도] 비밀번호 저장 / [호출] 비밀번호 폼 submit
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (nextPassword.length < 8) {
      setPasswordMsg({ text: '새 비밀번호는 8자 이상이어야 합니다.', ok: false });
      return;
    }
    if (nextPassword !== confirmPw) {
      setPasswordMsg({ text: '새 비밀번호가 일치하지 않습니다.', ok: false });
      return;
    }
    setSavingPw(true);
    setPasswordMsg({ text: '', ok: false });
    try {
      await updatePassword(curPassword, nextPassword);
      setPasswordMsg({ text: '비밀번호가 변경되었습니다.', ok: true });
      setCurPassword(''); setNextPassword(''); setConfirmPw('');
    } catch (err) {
      const status = err?.response?.status;
      setPasswordMsg({
        text: status === 400 ? '현재 비밀번호가 올바르지 않습니다.' : '변경에 실패했습니다.',
        ok: false,
      });
    } finally {
      setSavingPw(false);
    }
  };

  // [용도] 자동 동기화 주기 변경 / [호출] 라디오 버튼 onChange
  const handleSyncChange = (sec) => {
    setSyncInterval(sec);
    localStorage.setItem(INTERVAL_KEY, sec);
    window.dispatchEvent(new CustomEvent('syncIntervalChange', { detail: sec }));
  };

  // [용도] 이미지 파일을 80x80 JPEG base64로 압축 / [호출] handleAvatarChange
  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 80; canvas.height = 80;
        const ctx = canvas.getContext('2d');
        // 정사각형 크롭 후 리사이즈
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 80, 80);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = url;
    });

  // [용도] 프로필 사진 변경 (파일 선택 시 압축 후 저장) / [호출] input[file] onChange
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      await updateAvatar(base64);
      setUserInfo((prev) => ({ ...prev, avatar: base64 }));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { avatar: base64 } }));
    } catch {
      // 업로드 실패 시 무시
    }
  };

  const toggle = (section) =>
    setActiveSection((prev) => (prev === section ? null : section));

  const nicknameInitial = userInfo.nickname
    ? userInfo.nickname.charAt(0).toUpperCase()
    : '?';

  return (
    <div className="settings-panel" ref={panelRef}>
      {/* 헤더 */}
      <div className="settings-panel-header">
        <label className="settings-avatar-lg settings-avatar-upload" title="사진 변경">
          {userInfo.avatar
            ? <img src={userInfo.avatar} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : nicknameInitial}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <span className="settings-avatar-overlay">📷</span>
        </label>
        <div className="settings-user-info">
          <div className="settings-nickname">{userInfo.nickname || '...'}</div>
          <div className="settings-email">{userInfo.email || '...'}</div>
        </div>
        <button className="settings-panel-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-divider" />

      {/* 섹션: 닉네임 변경 */}
      <div className="settings-section">
        <button
          className={`settings-section-toggle${activeSection === 'nickname' ? ' open' : ''}`}
          onClick={() => toggle('nickname')}
        >
          <span>✏️ 닉네임 변경</span>
          <span className="settings-chevron">{activeSection === 'nickname' ? '▲' : '▼'}</span>
        </button>
        {activeSection === 'nickname' && (
          <form className="settings-form" onSubmit={handleNicknameSave}>
            <input
              className="settings-input"
              type="text"
              placeholder="새 닉네임"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              maxLength={20}
            />
            {nicknameMsg.text && (
              <div className={`settings-msg ${nicknameMsg.ok ? 'ok' : 'err'}`}>
                {nicknameMsg.text}
              </div>
            )}
            <button className="settings-submit-btn" type="submit" disabled={savingNick}>
              {savingNick ? '저장 중…' : '저장'}
            </button>
          </form>
        )}
      </div>

      {/* 섹션: 비밀번호 변경 */}
      <div className="settings-section">
        <button
          className={`settings-section-toggle${activeSection === 'password' ? ' open' : ''}`}
          onClick={() => toggle('password')}
        >
          <span>🔒 비밀번호 변경</span>
          <span className="settings-chevron">{activeSection === 'password' ? '▲' : '▼'}</span>
        </button>
        {activeSection === 'password' && (
          <form className="settings-form" onSubmit={handlePasswordSave}>
            <input
              className="settings-input"
              type="password"
              placeholder="현재 비밀번호"
              value={curPassword}
              onChange={(e) => setCurPassword(e.target.value)}
            />
            <input
              className="settings-input"
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
            />
            <input
              className="settings-input"
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
            />
            {passwordMsg.text && (
              <div className={`settings-msg ${passwordMsg.ok ? 'ok' : 'err'}`}>
                {passwordMsg.text}
              </div>
            )}
            <button className="settings-submit-btn" type="submit" disabled={savingPw}>
              {savingPw ? '변경 중…' : '변경'}
            </button>
          </form>
        )}
      </div>

      {/* 섹션: 자동 동기화 주기 */}
      <div className="settings-section">
        <button
          className={`settings-section-toggle${activeSection === 'sync' ? ' open' : ''}`}
          onClick={() => toggle('sync')}
        >
          <span>🔄 자동 동기화 주기</span>
          <span className="settings-chevron">{activeSection === 'sync' ? '▲' : '▼'}</span>
        </button>
        {activeSection === 'sync' && (
          <div className="settings-form">
            <div className="settings-sync-options">
              {SYNC_OPTIONS.map((opt) => (
                <label key={opt.value} className="settings-sync-option">
                  <input
                    type="radio"
                    name="syncInterval"
                    value={opt.value}
                    checked={syncInterval === opt.value}
                    onChange={() => handleSyncChange(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="settings-divider" />

      {/* 로그아웃 */}
      <button
        className="settings-logout-btn"
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent('requestLogout'));
        }}
      >
        로그아웃
      </button>
    </div>
  );
};

export default SettingsPanel;
