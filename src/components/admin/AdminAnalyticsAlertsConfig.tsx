import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Slack, Plus, Trash2, Save, Sliders, TestTube2 } from "lucide-react";
import { toast } from "sonner";

const ALL_BPS = ["xs", "sm", "md", "lg", "xl"];
const ALL_ORS = ["portrait", "landscape"];

type Config = {
  retry_threshold: number;
  error_threshold: number;
  min_loads: number;
  debounce_minutes: number;
  email_enabled: boolean;
  slack_enabled: boolean;
  email_recipients: string[];
  slack_webhook_url: string | null;
};
type Override = {
  id?: string;
  breakpoint: string | null;
  orientation: string | null;
  retry_threshold: number | null;
  error_threshold: number | null;
  min_loads: number | null;
  debounce_minutes: number | null;
  enabled: boolean;
};

export const AdminAnalyticsAlertsConfig = () => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from("class_analytics_alert_config" as any).select("*").eq("id", true).maybeSingle(),
      supabase.from("class_analytics_alert_overrides" as any).select("*").order("breakpoint", { nullsFirst: true }),
    ]);
    if (c) setCfg(c as any);
    setOverrides((o as any) || []);
  };
  useEffect(() => { load(); }, []);

  const validateCfg = (c: Config): string | null => {
    if (c.retry_threshold <= 0 || c.retry_threshold > 1) return "Retry rate must be 1–100%";
    if (c.error_threshold <= 0 || c.error_threshold > 1) return "Error rate must be 1–100%";
    if (!Number.isInteger(c.min_loads) || c.min_loads < 1 || c.min_loads > 100000) return "Min loads must be 1–100000";
    if (!Number.isInteger(c.debounce_minutes) || c.debounce_minutes < 1 || c.debounce_minutes > 1440) return "Debounce must be 1–1440 min";
    if (c.slack_enabled && !/^https:\/\/hooks\.slack\.com\//.test(c.slack_webhook_url || "")) return "Slack webhook URL is invalid";
    if (c.email_enabled && c.email_recipients.length === 0) return "Add at least one email recipient";
    return null;
  };
  const validateOverride = (o: Override): string | null => {
    const inRange = (v: number | null, lo: number, hi: number) => v == null || (v >= lo && v <= hi);
    if (!inRange(o.retry_threshold != null ? o.retry_threshold * 100 : null, 1, 100)) return "Retry % must be 1–100";
    if (!inRange(o.error_threshold != null ? o.error_threshold * 100 : null, 1, 100)) return "Error % must be 1–100";
    if (!inRange(o.min_loads, 1, 100000)) return "Min loads must be 1–100000";
    if (!inRange(o.debounce_minutes, 1, 1440)) return "Debounce must be 1–1440 min";
    if (!o.breakpoint && !o.orientation) return "Set at least a breakpoint or orientation";
    return null;
  };

  const saveCfg = async () => {
    if (!cfg) return;
    const err = validateCfg(cfg);
    if (err) return toast.error(err);
    setSaving(true);
    const { error } = await supabase
      .from("class_analytics_alert_config" as any)
      .update({ ...cfg, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Alert settings saved");
  };

  const addEmail = () => {
    if (!cfg) return;
    const e = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return toast.error("Invalid email");
    if (cfg.email_recipients.includes(e)) return;
    setCfg({ ...cfg, email_recipients: [...cfg.email_recipients, e] });
    setNewEmail("");
  };
  const removeEmail = (e: string) => cfg && setCfg({ ...cfg, email_recipients: cfg.email_recipients.filter(x => x !== e) });

  const addOverride = () => {
    setOverrides(prev => [...prev, {
      breakpoint: null, orientation: null,
      retry_threshold: null, error_threshold: null, min_loads: null, debounce_minutes: null, enabled: true,
    }]);
  };
  const updateOverride = (idx: number, patch: Partial<Override>) => {
    setOverrides(prev => prev.map((o, i) => i === idx ? { ...o, ...patch } : o));
  };
  const removeOverride = async (idx: number) => {
    const o = overrides[idx];
    if (o.id) {
      const { error } = await supabase.from("class_analytics_alert_overrides" as any).delete().eq("id", o.id);
      if (error) return toast.error(error.message);
    }
    setOverrides(prev => prev.filter((_, i) => i !== idx));
  };
  const saveOverride = async (idx: number) => {
    const o = overrides[idx];
    const vErr = validateOverride(o);
    if (vErr) return toast.error(vErr);
    const payload = { ...o, updated_at: new Date().toISOString() };
    if (o.id) {
      const { error } = await supabase.from("class_analytics_alert_overrides" as any).update(payload).eq("id", o.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("class_analytics_alert_overrides" as any).insert(payload).select().single();
      if (error) return toast.error(error.message);
      updateOverride(idx, { id: (data as any).id });
    }
    toast.success("Override saved");
  };

  const sendTest = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("dispatch-analytics-alert", {
      body: { spikes: [{ kind: "retry", breakpoint: "test", orientation: "portrait", rate: 0.42, loads: 12 }] },
    });
    setTesting(false);
    if (error) return toast.error(error.message);
    const first = (data as any)?.results?.[0];
    if (first?.deduped) toast.info("Test skipped (debounce window active)");
    else if (first?.channels?.length) toast.success(`Test sent via: ${first.channels.join(", ")}`);
    else toast.warning("No channels sent — enable Slack/email and configure recipients");
  };

  if (!cfg) return <div className="text-xs text-muted-foreground">Loading alert settings…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Analytics alert channels</h3>
      </div>

      {/* Global thresholds */}
      <Card className="p-3 bg-card/60 border-border space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Sliders className="w-3.5 h-3.5" /> Global thresholds
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Field label="Retry rate ≥" suffix="%"
            value={Math.round(cfg.retry_threshold * 100)}
            onChange={v => setCfg({ ...cfg, retry_threshold: Math.max(1, Math.min(100, v)) / 100 })} />
          <Field label="Error rate ≥" suffix="%"
            value={Math.round(cfg.error_threshold * 100)}
            onChange={v => setCfg({ ...cfg, error_threshold: Math.max(1, Math.min(100, v)) / 100 })} />
          <Field label="Min loads" value={cfg.min_loads}
            onChange={v => setCfg({ ...cfg, min_loads: Math.max(1, v) })} />
          <Field label="Debounce" suffix="min" value={cfg.debounce_minutes}
            onChange={v => setCfg({ ...cfg, debounce_minutes: Math.max(1, Math.min(1440, v)) })} />
        </div>

        {/* Channels */}
        <div className="grid gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Slack className="w-4 h-4 text-primary" />
              <Label className="text-xs">Slack webhook</Label>
            </div>
            <Switch checked={cfg.slack_enabled} onCheckedChange={v => setCfg({ ...cfg, slack_enabled: v })} />
          </div>
          <Input placeholder="https://hooks.slack.com/services/…" value={cfg.slack_webhook_url || ""}
            onChange={e => setCfg({ ...cfg, slack_webhook_url: e.target.value })} className="h-8 text-xs font-mono" />

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="text-xs">Email recipients</Label>
            </div>
            <Switch checked={cfg.email_enabled} onCheckedChange={v => setCfg({ ...cfg, email_enabled: v })} />
          </div>
          <div className="flex gap-2">
            <Input type="email" placeholder="ops@example.com" value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addEmail())}
              className="h-8 text-xs" />
            <Button size="sm" onClick={addEmail} className="h-8 min-w-11"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cfg.email_recipients.map(e => (
              <Badge key={e} variant="secondary" className="text-[10px] gap-1">
                {e}
                <button onClick={() => removeEmail(e)} aria-label={`Remove ${e}`}><Trash2 className="w-3 h-3" /></button>
              </Badge>
            ))}
            {!cfg.email_recipients.length && <span className="text-[10px] text-muted-foreground">None configured</span>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={sendTest} disabled={testing} className="h-8 text-xs">
            <TestTube2 className="w-3.5 h-3.5 mr-1" />{testing ? "Sending…" : "Send test alert"}
          </Button>
          <Button size="sm" onClick={saveCfg} disabled={saving} className="h-8 text-xs">
            <Save className="w-3.5 h-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Card>

      {/* Per-breakpoint/orientation overrides */}
      <Card className="p-3 bg-card/60 border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Per-scope overrides</span>
          <Button size="sm" variant="outline" onClick={addOverride} className="h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />Add
          </Button>
        </div>
        {overrides.length === 0 && (
          <p className="text-[11px] text-muted-foreground">No overrides — global thresholds apply everywhere.</p>
        )}
        {overrides.map((o, idx) => (
          <div key={o.id || idx} className="grid grid-cols-2 md:grid-cols-8 gap-1.5 items-end p-2 rounded border border-border/40">
            <SelectField label="Breakpoint" value={o.breakpoint} onChange={v => updateOverride(idx, { breakpoint: v })} options={ALL_BPS} />
            <SelectField label="Orientation" value={o.orientation} onChange={v => updateOverride(idx, { orientation: v })} options={ALL_ORS} />
            <NumField label="Retry %" value={o.retry_threshold != null ? Math.round(o.retry_threshold * 100) : null}
              onChange={v => updateOverride(idx, { retry_threshold: v == null ? null : v / 100 })} />
            <NumField label="Error %" value={o.error_threshold != null ? Math.round(o.error_threshold * 100) : null}
              onChange={v => updateOverride(idx, { error_threshold: v == null ? null : v / 100 })} />
            <NumField label="Min loads" value={o.min_loads} onChange={v => updateOverride(idx, { min_loads: v })} />
            <NumField label="Debounce min" value={o.debounce_minutes} onChange={v => updateOverride(idx, { debounce_minutes: v })} />
            <div className="flex items-center gap-1">
              <Switch checked={o.enabled} onCheckedChange={v => updateOverride(idx, { enabled: v })} />
              <Label className="text-[10px]">On</Label>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => saveOverride(idx)} className="h-7 text-[10px] flex-1">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => removeOverride(idx)} className="h-7 w-7 p-0" aria-label="Remove override">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const Field = ({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) => (
  <div className="flex flex-col gap-1">
    <Label className="text-[10px] uppercase text-muted-foreground">{label}{suffix ? ` (${suffix})` : ""}</Label>
    <Input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)} className="h-8 text-xs" />
  </div>
);
const NumField = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) => (
  <div className="flex flex-col gap-1">
    <Label className="text-[9px] uppercase text-muted-foreground">{label}</Label>
    <Input type="number" value={value ?? ""} placeholder="—"
      onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-7 text-[11px]" />
  </div>
);
const SelectField = ({ label, value, onChange, options }: { label: string; value: string | null; onChange: (v: string | null) => void; options: string[] }) => (
  <div className="flex flex-col gap-1">
    <Label className="text-[9px] uppercase text-muted-foreground">{label}</Label>
    <select value={value || ""} onChange={e => onChange(e.target.value || null)}
      className="h-7 text-[11px] bg-background border border-border rounded px-1">
      <option value="">any</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);
