import { useState } from "react";
import { changePassword, updatePreferences, updateProfile } from "../api/userApi";
import { useAuthStore } from "../store/authStore";

const SettingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [prefs, setPrefs] = useState({
    defaultSessionMinutes: user?.preferences?.defaultSessionMinutes || 60,
    pomodoroMinutes: user?.preferences?.pomodoroMinutes || 25,
    breakMinutes: user?.preferences?.breakMinutes || 5,
  });
  const [notifications, setNotifications] = useState({
    sessionReminders: user?.notifications?.sessionReminders ?? true,
    achievementNotifications: user?.notifications?.achievementNotifications ?? true,
    roomInvites: user?.notifications?.roomInvites ?? true,
  });
  const [appearance, setAppearance] = useState({
    theme: user?.appearance?.theme || "dark",
    accentColor: user?.appearance?.accentColor || "#5eead4",
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: user?.privacy?.profileVisible ?? true,
    activityVisible: user?.privacy?.activityVisible ?? true,
  });
  const [security, setSecurity] = useState({ currentPassword: "", newPassword: "" });

  const handleProfileSave = async () => {
    setStatus("");
    try {
      const data = await updateProfile(profileForm);
      setUser(data.user);
      setStatus("Profile updated.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to update profile.");
    }
  };

  const handlePreferencesSave = async () => {
    setStatus("");
    try {
      const data = await updatePreferences({ preferences: prefs, notifications, appearance, privacy });
      setUser(data.user);
      setStatus("Preferences saved.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to save preferences.");
    }
  };

  const handlePasswordChange = async () => {
    setStatus("");
    try {
      await changePassword(security);
      setSecurity({ currentPassword: "", newPassword: "" });
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to update password.");
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Workspace settings</h1>
          <p className="subcopy">Tune notifications, preferences, and security.</p>
        </div>
      </header>

      {status ? <div className="dashboard-alert">{status}</div> : null}

      <section className="dashboard-card settings-card">
        <h2>Account settings</h2>
        <div className="settings-grid">
          <label>
            Name
            <input value={profileForm.name} onChange={(event) => setProfileForm((c) => ({ ...c, name: event.target.value }))} />
          </label>
          <label>
            Email
            <input value={profileForm.email} onChange={(event) => setProfileForm((c) => ({ ...c, email: event.target.value }))} />
          </label>
          <label>
            Profile photo URL
            <input value={profileForm.avatarUrl} onChange={(event) => setProfileForm((c) => ({ ...c, avatarUrl: event.target.value }))} />
          </label>
        </div>
        <button type="button" className="primary-button" onClick={handleProfileSave}>
          Save profile
        </button>
      </section>

      <section className="dashboard-card settings-card">
        <h2>Study preferences</h2>
        <div className="settings-grid">
          <label>
            Default session duration (mins)
            <input type="number" value={prefs.defaultSessionMinutes} onChange={(event) => setPrefs((c) => ({ ...c, defaultSessionMinutes: Number(event.target.value) }))} />
          </label>
          <label>
            Pomodoro length (mins)
            <input type="number" value={prefs.pomodoroMinutes} onChange={(event) => setPrefs((c) => ({ ...c, pomodoroMinutes: Number(event.target.value) }))} />
          </label>
          <label>
            Break duration (mins)
            <input type="number" value={prefs.breakMinutes} onChange={(event) => setPrefs((c) => ({ ...c, breakMinutes: Number(event.target.value) }))} />
          </label>
        </div>
      </section>

      <section className="dashboard-card settings-card">
        <h2>Notifications</h2>
        <div className="toggle-grid">
          <label>
            <input type="checkbox" checked={notifications.sessionReminders} onChange={(event) => setNotifications((c) => ({ ...c, sessionReminders: event.target.checked }))} />
            Session reminders
          </label>
          <label>
            <input type="checkbox" checked={notifications.achievementNotifications} onChange={(event) => setNotifications((c) => ({ ...c, achievementNotifications: event.target.checked }))} />
            Achievement notifications
          </label>
          <label>
            <input type="checkbox" checked={notifications.roomInvites} onChange={(event) => setNotifications((c) => ({ ...c, roomInvites: event.target.checked }))} />
            Room invites
          </label>
        </div>
      </section>

      <section className="dashboard-card settings-card">
        <h2>Appearance</h2>
        <div className="settings-grid">
          <label>
            Theme
            <select value={appearance.theme} onChange={(event) => setAppearance((c) => ({ ...c, theme: event.target.value }))}>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Accent color
            <input type="color" value={appearance.accentColor} onChange={(event) => setAppearance((c) => ({ ...c, accentColor: event.target.value }))} />
          </label>
        </div>
      </section>

      <section className="dashboard-card settings-card">
        <h2>Privacy</h2>
        <div className="toggle-grid">
          <label>
            <input type="checkbox" checked={privacy.profileVisible} onChange={(event) => setPrivacy((c) => ({ ...c, profileVisible: event.target.checked }))} />
            Profile visibility
          </label>
          <label>
            <input type="checkbox" checked={privacy.activityVisible} onChange={(event) => setPrivacy((c) => ({ ...c, activityVisible: event.target.checked }))} />
            Activity visibility
          </label>
        </div>
        <button type="button" className="primary-button" onClick={handlePreferencesSave}>
          Save preferences
        </button>
      </section>

      <section className="dashboard-card settings-card">
        <h2>Security</h2>
        <div className="settings-grid">
          <label>
            Current password
            <input type="password" value={security.currentPassword} onChange={(event) => setSecurity((c) => ({ ...c, currentPassword: event.target.value }))} />
          </label>
          <label>
            New password
            <input type="password" value={security.newPassword} onChange={(event) => setSecurity((c) => ({ ...c, newPassword: event.target.value }))} />
          </label>
        </div>
        <button type="button" className="secondary-button" onClick={handlePasswordChange}>
          Change password
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;
