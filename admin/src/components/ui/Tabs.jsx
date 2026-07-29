'use client';

import { useRef } from 'react';

/**
 * Tabs.
 *
 * The pill-tab pattern (`bg-gray-100 p-1 rounded-xl` around a row of buttons)
 * is duplicated in workers, admins, admin-overrides, admin-messages, map,
 * announcements and ai-insights. None of the copies carries a `tab`/`tabpanel`
 * role or supports arrow keys, so to a screen reader they are an unexplained
 * row of buttons and to a keyboard user they are seven tab stops instead of one.
 *
 * Roving tabindex: only the selected tab is reachable with Tab, and Left/Right
 * move between them. That is the ARIA-authoring-practices behaviour and it is
 * what makes a seven-tab bar one stop rather than seven.
 *
 * @typedef {{ id: string, label: string, badge?: React.ReactNode, disabled?: boolean }} TabItem
 *
 * @typedef {object} TabsProps
 * @property {TabItem[]} tabs
 * @property {string} value
 * @property {(id: string) => void} onChange
 * @property {string} [label] accessible name for the tablist
 * @property {string} [className]
 */

/** @param {TabsProps} props */
export default function Tabs({ tabs, value, onChange, label = 'Sections', className = '' }) {
  const refs = useRef({});

  const move = (delta) => {
    const enabled = tabs.filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.id === value);
    if (index === -1) return;
    // Wraps, which is what the pattern specifies — Right on the last tab
    // returns to the first rather than dead-ending.
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = tabs.find((t) => !t.disabled);
      if (first) {
        onChange(first.id);
        refs.current[first.id]?.focus();
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = [...tabs].reverse().find((t) => !t.disabled);
      if (last) {
        onChange(last.id);
        refs.current[last.id]?.focus();
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-alt p-0.5 ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${tab.id}`}
            // Roving tabindex — see the note above.
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium
              transition-colors disabled:cursor-not-allowed disabled:opacity-40
              ${selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`tabular rounded-full px-1.5 text-[10px] font-semibold ${
                  selected ? 'bg-primary-soft text-primary-strong' : 'bg-border text-ink-muted'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The panel a tab controls. Wiring the ids by hand at every call site is how
 * `aria-controls` ends up pointing at nothing.
 *
 * @param {{ id: string, value: string, children: React.ReactNode }} props
 */
export function TabPanel({ id, value, children }) {
  if (id !== value) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}
