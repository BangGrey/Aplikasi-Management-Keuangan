import { useLanguage } from "./Language.jsx";import { tr } from "./language.mjs";import React, { useEffect } from 'react';
import { LockKeyhole } from 'lucide-react';
import ThemeCharacter from './ThemeCharacter.jsx';
import './assistant-companion.css';

function FriendlyRobot() {useLanguage();
  return <svg className="companion-robot" viewBox="0 0 100 90" fill="none" aria-hidden="true"><path d="M50 20V12" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" /><circle cx="50" cy="9" r="5" fill="var(--theme-secondary)" /><rect x="10" y="37" width="12" height="23" rx="6" fill="var(--accent)" /><rect x="78" y="37" width="12" height="23" rx="6" fill="var(--accent)" /><rect x="18" y="24" width="64" height="52" rx="21" fill="var(--light)" stroke="var(--accent)" strokeWidth="2" /><rect x="26" y="33" width="48" height="31" rx="13" fill="white" /><g className="companion-eyes" fill="var(--accent)"><ellipse cx="39" cy="46" rx="3" ry="4" /><ellipse cx="61" cy="46" rx="3" ry="4" /></g><path d="M45 55Q50 60 55 55" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /><ellipse cx="31" cy="54" rx="5" ry="3" fill="#f1bdc9" /><ellipse cx="69" cy="54" rx="5" ry="3" fill="#f1bdc9" /></svg>;
}

export default function AssistantCompanion({ theme, name, opened, busy = false, premium, onToggle }) {useLanguage();
  return <div className={'assistant-home' + (busy ? ' is-thinking' : '') + (opened ? ' is-open' : '')}><button className="assistant-companion" type="button" aria-label={premium ? tr("Buka chat {p0}", { p0: name || tr('Asisten keuangan') }) : tr("Buka informasi Asisten Premium")} aria-expanded={opened} aria-controls="financial-assistant-panel" onClick={onToggle}><span className="companion-bubble">{busy ? tr("Sebentar, aku bantu…") : opened ? tr("Aku di sini, yuk cerita!") : tr("Aku bisa bantu kamu")}<span aria-hidden="true">{busy ? ' ···' : ' ✦'}</span></span><span className="companion-figure" aria-hidden="true"><span className="companion-halo" /><span className="companion-shadow" /><svg className="companion-body" viewBox="0 0 100 75" fill="none"><ellipse cx="49" cy="47" rx="19" ry="22" fill="var(--light)" stroke="var(--accent)" strokeWidth="1.5" /><path d="M35 65L30 70M62 65L68 70" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" /><path d="M31 41L21 49" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" /><g className="companion-wave"><path d="M65 41Q82 40 81 25" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" /><circle cx="81" cy="22" r="6" fill="var(--light)" stroke="var(--accent)" strokeWidth="1.5" /></g><path d="M46 48L50 52L56 44" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="companion-head">{theme?.character ? <ThemeCharacter kind={theme.character} /> : <FriendlyRobot />}</span><span className="companion-sparkle sparkle-one">✧</span><span className="companion-sparkle sparkle-two">♡</span></span><span className="companion-name">{!premium && <LockKeyhole size={10} />}<span>{premium ? name || tr("Asistenmu") : tr("Asisten Premium")}</span><i aria-hidden="true" /></span></button></div>;
}

export function useAssistantPanel(opened, setOpened) {
  useEffect(() => {
    if (!opened) return;
    const panel = document.getElementById('financial-assistant-panel');
    (panel?.querySelector('.assistant-input input:not(:disabled)') || panel?.querySelector('button:not(:disabled)'))?.focus();
    function escape(event) {if (event.key === 'Escape') {setOpened(false);document.querySelector('[aria-controls="financial-assistant-panel"]')?.focus();}}
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [opened, setOpened]);
}
