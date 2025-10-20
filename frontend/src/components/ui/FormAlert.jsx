// src/components/ui/FormAlert.jsx
"use client";
export default function FormAlert({ variant = "error", title, desc }) {
  const theme = {
    error:  { bg: "bg-red-50",  text: "text-red-800",  border: "border-red-200",  icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
        <path d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path d="M1 21h22L12 2 1 21z"/>
      </svg>
    )},
    info:   { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
        <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
        10-4.48 10-10S17.52 2 12 2z"/>
      </svg>
    )},
    success:{ bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
        <path d="M9 16.17l-3.88-3.88L4 13.41 9 18.41 20.59 6.83 19.17 5.41z"/>
      </svg>
    )},
  }[variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex gap-3 items-start ${theme.bg} ${theme.text} ${theme.border} border rounded-lg px-3 py-2`}
    >
      <span className="mt-0.5">{theme.icon}</span>
      <div className="text-sm">
        {title && <p className="font-medium">{title}</p>}
        {desc && <p className="opacity-90">{desc}</p>}
      </div>
    </div>
  );
}
