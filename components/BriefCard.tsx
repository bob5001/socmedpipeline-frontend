'use client';
import { Brief } from '@/lib/types';

interface Props {
  brief: Brief;
  onChange: (brief: Brief) => void;
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors resize-none"
      />
    </div>
  );
}

function ArrayInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const display = (value || []).join(', ');
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label} (comma-separated)</label>
      <input
        type="text"
        value={display}
        onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-indigo-500 transition-colors"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BriefCard({ brief, onChange }: Props) {
  const set = <K extends keyof Brief>(key: K, value: Brief[K]) =>
    onChange({ ...brief, [key]: value });

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <FieldGroup title="Business">
        <TextInput label="Business Name" value={brief.business_name} onChange={v => set('business_name', v)} />
        <TextInput label="Industry" value={brief.industry} onChange={v => set('industry', v)} />
        <TextInput label="Location" value={brief.location} onChange={v => set('location', v)} />
        <TextInput label="Service Area" value={brief.service_area} onChange={v => set('service_area', v)} />
      </FieldGroup>

      <FieldGroup title="Audience">
        <TextArea label="Target Audience" value={brief.target_audience} onChange={v => set('target_audience', v)} />
        <TextArea label="Customer Pain Point" value={brief.customer_pain_point} onChange={v => set('customer_pain_point', v)} />
        <TextInput label="Discovery Channels" value={brief.discovery_channels} onChange={v => set('discovery_channels', v)} />
        <TextArea label="Differentiator" value={brief.differentiator} onChange={v => set('differentiator', v)} />
      </FieldGroup>

      <FieldGroup title="Voice">
        <SelectInput
          label="Brand Voice"
          value={brief.brand_voice}
          options={[
            { value: 'casual', label: 'Casual' },
            { value: 'professional', label: 'Professional' },
            { value: 'warm', label: 'Warm' },
            { value: 'edgy', label: 'Edgy' },
          ]}
          onChange={v => set('brand_voice', v as Brief['brand_voice'])}
        />
        <TextArea label="Tone Notes" value={brief.tone_notes} onChange={v => set('tone_notes', v)} />
        <ArrayInput label="Avoid Topics" value={brief.avoid_topics} onChange={v => set('avoid_topics', v)} />
        <ArrayInput label="Emphasis Topics" value={brief.emphasis_topics} onChange={v => set('emphasis_topics', v)} />
      </FieldGroup>

      <FieldGroup title="Platforms & Logistics">
        <ArrayInput label="Platforms" value={brief.platforms} onChange={v => set('platforms', v)} />
        <TextInput label="Posting Frequency" value={brief.posting_frequency} onChange={v => set('posting_frequency', v)} />
        <SelectInput
          label="Content Sources"
          value={brief.content_sources}
          options={[
            { value: 'user_photos', label: 'User Photos' },
            { value: 'ai_generated', label: 'AI Generated' },
            { value: 'mixed', label: 'Mixed' },
          ]}
          onChange={v => set('content_sources', v as Brief['content_sources'])}
        />
      </FieldGroup>

      <FieldGroup title="Hooks & Upcoming Events">
        {(brief.upcoming_hooks || []).length === 0 ? (
          <p className="text-zinc-600 text-sm">No upcoming hooks.</p>
        ) : (
          brief.upcoming_hooks.map((hook, i) => (
            <div key={i} className="bg-zinc-800 rounded-xl p-3 space-y-2">
              <TextInput
                label="Event"
                value={hook.event}
                onChange={v => {
                  const updated = [...brief.upcoming_hooks];
                  updated[i] = { ...updated[i], event: v };
                  set('upcoming_hooks', updated);
                }}
              />
              <TextInput
                label="Date"
                value={hook.date}
                onChange={v => {
                  const updated = [...brief.upcoming_hooks];
                  updated[i] = { ...updated[i], date: v };
                  set('upcoming_hooks', updated);
                }}
              />
              <TextInput
                label="Notes"
                value={hook.notes}
                onChange={v => {
                  const updated = [...brief.upcoming_hooks];
                  updated[i] = { ...updated[i], notes: v };
                  set('upcoming_hooks', updated);
                }}
              />
            </div>
          ))
        )}
      </FieldGroup>

      <FieldGroup title="Summary">
        <TextArea label="Raw Summary" value={brief.raw_summary} onChange={v => set('raw_summary', v)} />
      </FieldGroup>
    </div>
  );
}
