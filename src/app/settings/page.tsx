"use client";

import { useState, useEffect } from "react";

interface Settings {
  intellicenter: {
    host: string;
    port: number;
  };
  weather: {
    apiKey: string;
    hasApiKey: boolean;
    stationId: string;
    lat: number | null;
    lon: number | null;
  };
  retentionDays: number;
  demo: boolean;
}

interface ValidationResult {
  valid: boolean;
  stationName?: string;
  lat?: number;
  lon?: number;
  error?: string;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pool-500 focus:border-pool-500 outline-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [icHost, setIcHost] = useState("");
  const [icPort, setIcPort] = useState("6680");
  const [wuApiKey, setWuApiKey] = useState("");
  const [wuStationId, setWuStationId] = useState("");
  const [retentionDays, setRetentionDays] = useState("90");

  // Weather validation
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/pool/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: Settings = await res.json();
      setSettings(data);

      setIcHost(data.intellicenter.host);
      setIcPort(String(data.intellicenter.port));
      setWuStationId(data.weather.stationId);
      setRetentionDays(String(data.retentionDays));
      // Don't populate API key from masked value
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        intellicenter: {
          host: icHost,
          port: icPort,
        },
        weather: {
          stationId: wuStationId,
          ...(wuApiKey ? { apiKey: wuApiKey } : {}),
        },
        retentionDays,
      };

      const res = await fetch("/api/pool/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaved(true);
      setWuApiKey(""); // Clear the API key field after saving
      await fetchSettings(); // Reload
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleValidateWeather() {
    const apiKey = wuApiKey || (settings?.weather.hasApiKey ? "__existing__" : "");
    if (!apiKey || !wuStationId) {
      setValidation({ valid: false, error: "Enter API key and station ID first" });
      return;
    }

    setValidating(true);
    setValidation(null);

    try {
      const res = await fetch("/api/pool/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: wuApiKey || undefined,
          stationId: wuStationId,
        }),
      });
      const data = await res.json();
      setValidation(data);
    } catch {
      setValidation({ valid: false, error: "Connection failed" });
    } finally {
      setValidating(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pool-200 border-t-pool-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>

      {settings?.demo && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-700">
            Running in <strong>demo mode</strong>. Settings are read-only.
            Disable DEMO_MODE in your environment to connect to a real controller.
          </p>
        </div>
      )}

      {/* IntelliCenter Connection */}
      <SectionCard title="IntelliCenter Connection">
        <InputField
          label="Controller IP Address"
          value={icHost}
          onChange={setIcHost}
          placeholder="192.168.1.100"
          hint="Local IP of your IntelliCenter on the same network"
        />
        <InputField
          label="Port"
          value={icPort}
          onChange={setIcPort}
          placeholder="6680"
          type="number"
          hint="Default WebSocket port is 6680"
        />
      </SectionCard>

      {/* Weather Underground */}
      <SectionCard title="Weather Underground">
        <InputField
          label="API Key"
          value={wuApiKey}
          onChange={setWuApiKey}
          placeholder={settings?.weather.hasApiKey ? "••••••••(saved)" : "Enter your API key"}
          type="password"
          hint="Get a free key at wunderground.com/member/api-keys (requires a registered PWS)"
        />
        <InputField
          label="Station ID"
          value={wuStationId}
          onChange={setWuStationId}
          placeholder="KCASONOM123"
          hint="Your Personal Weather Station ID"
        />

        <button
          onClick={handleValidateWeather}
          disabled={validating || (!wuApiKey && !settings?.weather.hasApiKey) || !wuStationId}
          className="mb-3 px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {validating ? "Checking..." : "Test Connection"}
        </button>

        {validation && (
          <div
            className={`rounded-lg p-3 text-sm ${
              validation.valid
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {validation.valid ? (
              <>
                Connected to <strong>{validation.stationName}</strong>
                {validation.lat != null && (
                  <span className="text-green-500 ml-1">
                    ({validation.lat.toFixed(2)}, {validation.lon?.toFixed(2)})
                  </span>
                )}
              </>
            ) : (
              validation.error
            )}
          </div>
        )}
      </SectionCard>

      {/* Data Retention */}
      <SectionCard title="Data Retention">
        <InputField
          label="Keep history for (days)"
          value={retentionDays}
          onChange={setRetentionDays}
          type="number"
          hint="Readings older than this are automatically pruned"
        />
      </SectionCard>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || settings?.demo}
          className="px-6 py-3 bg-pool-600 text-white font-medium rounded-xl hover:bg-pool-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Settings saved
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 font-medium">{error}</span>
        )}
      </div>
    </div>
  );
}
