import { useEffect, useState } from 'react';

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function maskDigits(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Plain masked text field for "HH:MM" — sidesteps the native
// <input type="time">, whose AM/PM vs 24h display depends on the
// browser/OS locale and can't be reliably forced off from the page.
export default function TimeField({ value, onChange, style }) {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  function commitIfValid(next) {
    if (TIME_RE.test(next)) onChange(next);
  }

  function handleBlur() {
    if (!TIME_RE.test(text)) setText(value || '');
  }

  return (
    <input
      className="input"
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      style={{ width: 90, padding: '8px 10px', textAlign: 'center', ...style }}
      value={text}
      onChange={(e) => {
        const masked = maskDigits(e.target.value);
        setText(masked);
        commitIfValid(masked);
      }}
      onBlur={handleBlur}
    />
  );
}
