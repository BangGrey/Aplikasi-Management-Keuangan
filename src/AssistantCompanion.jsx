import { useLanguage } from "./Language.jsx";import { tr } from "./language.mjs";import React, { useEffect } from 'react';
import { LockKeyhole } from 'lucide-react';
import CompanionCharacter from './CompanionCharacter.jsx';
import './assistant-companion.css';
import './companion-character.css';

export default function AssistantCompanion({ theme, name, opened, busy = false, premium, onToggle }) {useLanguage();
  return <div className={'assistant-home' + (busy ? ' is-thinking' : '') + (opened ? ' is-open' : '')}><button className="assistant-companion" type="button" aria-label={premium ? tr("Buka chat {p0}", { p0: name || tr('Asisten keuangan') }) : tr("Buka informasi Asisten Premium")} aria-expanded={opened} aria-controls="financial-assistant-panel" onClick={onToggle}><span className="companion-bubble">{busy ? tr("Sebentar, aku bantu…") : opened ? tr("Aku di sini, yuk cerita!") : tr("Aku bisa bantu kamu")}<span aria-hidden="true">{busy ? ' ···' : ' ✦'}</span></span><span className="companion-figure" aria-hidden="true"><span className="companion-halo" /><span className="companion-shadow" /><CompanionCharacter kind={theme?.character}/><span className="companion-sparkle sparkle-one">✧</span><span className="companion-sparkle sparkle-two">♡</span></span><span className="companion-name">{!premium && <LockKeyhole size={10} />}<span>{premium ? name || tr("Asistenmu") : tr("Asisten Premium")}</span><i aria-hidden="true" /></span></button></div>;
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
