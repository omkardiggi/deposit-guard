import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Building, Check, X, Loader2 } from 'lucide-react';
import { Institution } from '../types';
import { api } from '../services/api';

interface InstitutionComboboxProps {
  institutions: Institution[];
  value: string;                                  // selected institution id
  onChange: (id: string, inst: Institution | null) => void;
  onInstitutionAdded?: () => void;                // ask the app to refetch
}

const INSTITUTE_TYPES = [
  'Engineering & Technology',
  'Management',
  'Pharmacy',
  'Architecture & Town Planning',
  'Polytechnic / Diploma',
  'Applied Arts & Crafts',
  'Hotel Management & Catering',
];

/**
 * Type-ahead picker for institutions. The seeded list is small, so this filters
 * as you type and lets you register a new institution inline when the one you
 * need is not on file yet.
 */
export const InstitutionCombobox: React.FC<InstitutionComboboxProps> = ({
  institutions,
  value,
  onChange,
  onInstitutionAdded,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = institutions.find(i => i.id === value) || null;

  // New-institution form
  const [form, setForm] = useState({
    name: '', aicte_id: '', institute_type: INSTITUTE_TYPES[0],
    state: '', city: '', email: '', contact_person: '', phone: '', address: '',
  });

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? institutions.filter(i =>
        i.name.toLowerCase().includes(term) ||
        i.aicte_id.toLowerCase().includes(term) ||
        i.city.toLowerCase().includes(term) ||
        i.state.toLowerCase().includes(term))
    : institutions;

  const pick = (inst: Institution) => {
    onChange(inst.id, inst);
    setQuery('');
    setOpen(false);
  };

  const startAdding = () => {
    setForm(f => ({ ...f, name: query.trim() }));
    setAdding(true);
    setOpen(false);
    setError(null);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    setError(null);
    try {
      const created = await api.createInstitution({
        aicte_id: form.aicte_id.trim(),
        name: form.name.trim(),
        institute_type: form.institute_type,
        state: form.state.trim(),
        city: form.city.trim(),
        email: form.email.trim(),
        contact_person: form.contact_person.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      onInstitutionAdded?.();
      onChange(created.id, created);
      setAdding(false);
      setQuery('');
    } catch (err: any) {
      setError(err.message || 'Could not add institution');
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="border border-blue-300 bg-blue-50/40 rounded-xl p-3 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Register New Institution
          </span>
          <button type="button" onClick={() => setAdding(false)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-[11px]">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Institution Name *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="w-full p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">AICTE Permanent ID *</label>
            <input
              value={form.aicte_id}
              onChange={e => setForm({ ...form, aicte_id: e.target.value })}
              placeholder="1-234567890"
              required
              className="w-full p-2 font-mono bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Institute Type *</label>
            <select
              value={form.institute_type}
              onChange={e => setForm({ ...form, institute_type: e.target.value })}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg"
            >
              {INSTITUTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">City *</label>
            <input
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              required
              className="w-full p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">State *</label>
            <input
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              required
              className="w-full p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              className="w-full p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-semibold text-xs"
          >
            Cancel
          </button>
          {/* A nested <form> is invalid inside the parent FDR form, so this is a
              plain button that performs the create explicitly. */}
          <button
            type="button"
            onClick={submitNew}
            disabled={saving || !form.name || !form.aicte_id || !form.city || !form.state || !form.email}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Add Institution'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={open ? query : (selected ? `${selected.name} (${selected.aicte_id})` : query)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          placeholder="Type to search institutions…"
          className="w-full pl-9 pr-3 p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-xs">
              No institution matches “{query}”.
            </div>
          ) : (
            filtered.map(inst => (
              <button
                key={inst.id}
                type="button"
                onClick={() => pick(inst)}
                className={`w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0 ${
                  inst.id === value ? 'bg-blue-50/60' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-900 text-xs truncate">{inst.name}</span>
                  {inst.id === value && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto flex-shrink-0" />}
                </div>
                <div className="text-[11px] text-slate-500 pl-5 font-mono">
                  {inst.aicte_id} &bull; {inst.city}, {inst.state}
                </div>
              </button>
            ))
          )}

          <button
            type="button"
            onClick={startAdding}
            className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-1.5 border-t border-slate-200 sticky bottom-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {query.trim() ? `Register “${query.trim()}” as a new institution` : 'Register a new institution'}
          </button>
        </div>
      )}
    </div>
  );
};
