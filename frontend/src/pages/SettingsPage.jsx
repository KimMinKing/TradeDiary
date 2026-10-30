import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getMe,
  updateAvatar,
  updateLanguage,
  updateNickname,
  updatePassword,
  updatePrivacy,
} from "../api/userApi";
import ExchangeKeyPage from "./ExchangeKeyPage";
import useTheme from "../hooks/useTheme";

const tabs = ["profile", "preferences", "connections"];
const SettingsPage = () => {
  const [params, setParams] = useSearchParams();
  const active = tabs.includes(params.get("tab"))
    ? params.get("tab")
    : "profile";
  const [user, setUser] = useState({ email: "", nickname: "" });
  const [nickname, setNickname] = useState("");
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [message, setMessage] = useState("");
  const [currency, setCurrency] = useState(
    () => localStorage.getItem("displayCurrency") || "KRW",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("preferredLanguage") || "en",
  );
  const [interval, setIntervalValue] = useState(() =>
    Number(localStorage.getItem("autoSyncInterval") || 60),
  );
  const [privacy, setPrivacy] = useState({
    profile_public: false,
    diary_public: false,
    stats_public: false,
    positions_public: false,
    trades_public: false,
    assets_public: false,
  });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    getMe()
      .then(({ data }) => {
        setUser(data);
        setNickname(data.nickname || "");
        const nextLanguage = data.preferred_language || "en";
        setLanguage(nextLanguage);
        localStorage.setItem("preferredLanguage", nextLanguage);
        setPrivacy((current) =>
          Object.fromEntries(
            Object.keys(current).map((key) => [key, !!data[key]]),
          ),
        );
      })
      .catch(() => {});
  }, []);
  const saveName = async (event) => {
    event.preventDefault();
    if (nickname.trim().length < 2)
      return setMessage("Display name must contain at least two characters.");
    await updateNickname(nickname.trim());
    setUser((value) => ({ ...value, nickname: nickname.trim() }));
    window.dispatchEvent(
      new CustomEvent("profileUpdated", {
        detail: { nickname: nickname.trim() },
      }),
    );
    setMessage("Display name updated.");
  };
  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.next.length < 8)
      return setMessage("Password must contain at least eight characters.");
    if (passwords.next !== passwords.confirm)
      return setMessage("Passwords do not match.");
    await updatePassword(passwords.current, passwords.next);
    setPasswords({ current: "", next: "", confirm: "" });
    setMessage("Password updated.");
  };
  const changePrivacy = async (key, checked) => {
    const next = { ...privacy, [key]: checked };
    if (key === "profile_public" && !checked)
      Object.keys(next).forEach((item) => (next[item] = false));
    if (key !== "profile_public" && checked) next.profile_public = true;
    await updatePrivacy(next);
    setPrivacy(next);
  };
  const changeCurrency = (value) => {
    setCurrency(value);
    localStorage.setItem("displayCurrency", value);
    window.dispatchEvent(new CustomEvent("currencyChange", { detail: value }));
  };
  const changeLanguage = async (value) => {
    const previous = language;
    setLanguage(value);
    localStorage.setItem("preferredLanguage", value);
    window.dispatchEvent(new CustomEvent("languageChange", { detail: value }));
    try {
      await updateLanguage(value);
      setMessage(value === "ko" ? "언어 설정이 저장되었습니다." : "Language preference saved.");
    } catch {
      setLanguage(previous);
      localStorage.setItem("preferredLanguage", previous);
      window.dispatchEvent(new CustomEvent("languageChange", { detail: previous }));
      setMessage(previous === "ko" ? "언어 설정을 저장하지 못했습니다." : "Could not save the language preference.");
    }
  };
  const changeInterval = (value) => {
    setIntervalValue(value);
    localStorage.setItem("autoSyncInterval", value);
    window.dispatchEvent(
      new CustomEvent("syncIntervalChange", { detail: value }),
    );
  };
  const changeAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1_500_000
    ) {
      setMessage("Use a PNG, JPEG or WebP image under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await updateAvatar(reader.result);
      const next = { ...user, avatar: reader.result };
      setUser(next);
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { avatar: reader.result },
        }),
      );
      setMessage("Profile photo updated.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page settings-page">
      <div className="settings-panel-header">
        <div className="settings-avatar-lg">
          {user.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            user.nickname?.[0] || "T"
          )}
        </div>
        <div className="settings-user-info">
          <b>{user.nickname || "Trader"}</b>
          <span>{user.email}</span>
        </div>
      </div>
      <nav className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`settings-tab${active === tab ? " active" : ""}`}
            onClick={() => setParams({ tab })}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      {message && <div className="settings-msg ok">{message}</div>}
      {active === "connections" && (
        <section className="settings-embedded">
          <ExchangeKeyPage embedded />
        </section>
      )}
      {active === "profile" && (
        <div className="settings-clean-grid">
          <section className="settings-card">
            <h2>Profile</h2>
            <p>Update the identity shown across your workspace.</p>
            <div className="settings-photo">
              <div>
                {user.avatar ? (
                  <img src={user.avatar} alt="Profile" />
                ) : (
                  user.nickname?.[0] || "T"
                )}
              </div>
              <span>
                <b>Profile photo</b>
                <small>PNG, JPEG or WebP · 1.5 MB max</small>
                <label>
                  Choose image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={changeAvatar}
                  />
                </label>
              </span>
            </div>
            <form onSubmit={saveName}>
              <label>
                Display name
                <input
                  className="settings-input"
                  value={nickname}
                  maxLength="20"
                  onChange={(e) => setNickname(e.target.value)}
                />
              </label>
              <button className="settings-submit-btn">Save profile</button>
            </form>
          </section>
          <section className="settings-card">
            <h2>Security</h2>
            <p>Change the password used for email sign-in.</p>
            <form onSubmit={savePassword}>
              <label>
                Current password
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                />
              </label>
              <label>
                New password
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.next}
                  onChange={(e) =>
                    setPasswords({ ...passwords, next: e.target.value })
                  }
                />
              </label>
              <label>
                Confirm password
                <input
                  className="settings-input"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                />
              </label>
              <button className="settings-submit-btn">Update password</button>
            </form>
          </section>
        </div>
      )}
      {active === "preferences" && (
        <div className="settings-clean-grid">
          <section className="settings-card">
            <h2>Appearance</h2>
            <p>Choose how the workspace is displayed.</p>
            <SettingRow label="Theme">
              <button onClick={toggleTheme}>
                {theme === "dark" ? "Use light" : "Use dark"}
              </button>
            </SettingRow>
            <SettingRow label="Language">
              <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </select>
            </SettingRow>
            <SettingRow label="Currency">
              <select
                value={currency}
                onChange={(e) => changeCurrency(e.target.value)}
              >
                {["KRW", "USD", "CNY", "JPY"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="Auto sync">
              <select
                value={interval}
                onChange={(e) => changeInterval(Number(e.target.value))}
              >
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
                <option value="300">5 minutes</option>
                <option value="0">Off</option>
              </select>
            </SettingRow>
          </section>
          <section className="settings-card">
            <h2>Public profile</h2>
            <p>Control what other signed-in traders can view.</p>
            {[
              ["profile_public", "Profile"],
              ["diary_public", "Journal"],
              ["stats_public", "Analytics"],
              ["positions_public", "Positions"],
              ["trades_public", "Executions"],
              ["assets_public", "Assets"],
            ].map(([key, label]) => (
              <label className="settings-switch" key={key}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={privacy[key]}
                  onChange={(e) => changePrivacy(key, e.target.checked)}
                />
              </label>
            ))}
          </section>
        </div>
      )}
      <button
        className="settings-logout-btn"
        onClick={() => window.dispatchEvent(new CustomEvent("requestLogout"))}
      >
        Sign out
      </button>
    </div>
  );
};
const SettingRow = ({ label, children }) => (
  <div className="settings-clean-row">
    <span>{label}</span>
    {children}
  </div>
);
export default SettingsPage;
