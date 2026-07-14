import { useState } from 'react';

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.6 6.7C3.9 8.4 2 12 2 12s4 7 11 7c1.9 0 3.5-.5 4.9-1.2M17.5 17.4C20.1 15.7 22 12 22 12s-1.8-3.1-4.7-5.1A11.6 11.6 0 0 0 12 5c-.6 0-1.2.04-1.8.13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PasswordInput({ value, onChange, placeholder, minLength, required, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'oklch(0.62 0.01 260)',
          display: 'flex',
        }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
