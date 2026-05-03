import React, { useEffect, useState } from 'react';
import { Activity, Database, Globe2, LockKeyhole, Power, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminFetchOwnerSiteSettings, adminUpdateSiteSettings } from '../../lib/api';
import { useAdminAuth } from '../../contexts/admin-auth-context';
import { useAdminToast } from '../../components/admin/AdminToaster';
import { isOwnerAdmin } from '../../lib/adminOwner';

const DEFAULT_OFFLINE_TITLE = 'Website is offline';
const DEFAULT_OFFLINE_MESSAGE = 'We are updating the store. Please check back soon.';

const OwnerAccessDenied = () => (
  <div className="flex min-h-[420px] items-center justify-center">
    <section className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-[#0d1323] p-8 text-center shadow-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-rose-300">Access Denied</p>
      <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Owner account required</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        This page is locked and cannot be managed from a normal admin account.
      </p>
    </section>
  </div>
);

const AdminWebsiteControl = () => {
  const { admin, token, isAuthenticated, loading: authLoading } = useAdminAuth();
  const location = useLocation();
  const toast = useAdminToast();
  const [settings, setSettings] = useState({
    isOnline: true,
    title: DEFAULT_OFFLINE_TITLE,
    message: DEFAULT_OFFLINE_MESSAGE,
  });
  const [ownerStatus, setOwnerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !isOwnerAdmin(admin)) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminFetchOwnerSiteSettings(token);
        const siteSettings = data?.settings || data;
        if (active) {
          setSettings({
            isOnline: siteSettings?.isOnline !== false,
            title: siteSettings?.title || DEFAULT_OFFLINE_TITLE,
            message: siteSettings?.message || DEFAULT_OFFLINE_MESSAGE,
          });
          setOwnerStatus(data || null);
        }
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load website control.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [admin, token]);

  const saveSettings = async (nextSettings = settings) => {
    setSaving(true);
    setError('');
    try {
      const saved = await adminUpdateSiteSettings(token, nextSettings);
      setSettings({
        isOnline: saved?.isOnline !== false,
        title: saved?.title || nextSettings.title,
        message: saved?.message || nextSettings.message,
      });
      toast.success('Website Control Saved', saved?.isOnline === false ? 'Website is now OFF.' : 'Website is now ON.');
    } catch (err) {
      setError(err?.message || 'Unable to save website control.');
      toast.error('Save Failed', err?.message || 'Unable to save website control.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOnline = () => {
    const nextSettings = { ...settings, isOnline: !settings.isOnline };
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">Checking owner access...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isOwnerAdmin(admin)) {
    return <OwnerAccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400 font-medium">Loading website control...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Website Control</h2>
        <p className="mt-1 text-sm text-slate-400">Owner-only controls for the public website and backend status.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-800/60 bg-[#0d1323] p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${settings.isOnline ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
              {settings.isOnline ? <Globe2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Current Status</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                Website {settings.isOnline ? 'ON' : 'OFF'}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                When OFF, visitors see a black offline screen. Admin pages stay open so you can turn it back ON.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleOnline}
            disabled={saving}
            className={`inline-flex min-w-44 items-center justify-center gap-3 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${settings.isOnline ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
          >
            <Power className="h-5 w-5" />
            {saving ? 'Saving...' : settings.isOnline ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/60 bg-[#0d1323] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-emerald-300" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Backend</p>
          </div>
          <p className="mt-3 text-xl font-black text-white">{ownerStatus?.backend?.ok ? 'Online' : 'Checking'}</p>
          <p className="mt-1 text-xs text-slate-500">{ownerStatus?.backend?.timestamp || 'Refresh to verify status'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-[#0d1323] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-300" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Database</p>
          </div>
          <p className="mt-3 text-xl font-black text-white">
            {ownerStatus?.backend?.databaseConfigured ? 'Configured' : 'Not configured'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Private backend check</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-[#0d1323] p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-violet-300" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Access</p>
          </div>
          <p className="mt-3 text-xl font-black text-white">{ownerStatus?.owner?.access || 'OWNER'}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{ownerStatus?.owner?.email || admin?.email}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-[#0d1323] p-6 shadow-xl">
        <div className="grid gap-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Offline Heading</span>
            <input
              value={settings.title}
              onChange={(event) => setSettings((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-3 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500"
              maxLength={80}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Offline Message</span>
            <textarea
              value={settings.message}
              onChange={(event) => setSettings((prev) => ({ ...prev, message: event.target.value }))}
              rows={4}
              className="mt-3 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500"
              maxLength={240}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">{settings.title.length}/80 heading · {settings.message.length}/240 message</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => saveSettings()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-5 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save Text
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminWebsiteControl;
