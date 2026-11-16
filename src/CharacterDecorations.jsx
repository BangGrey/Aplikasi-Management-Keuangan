import { useLanguage } from "./Language.jsx";import { tr } from "./language.mjs";import React from 'react';
import ThemeCharacter from './ThemeCharacter.jsx';
import './characters.css';

export function CharacterSticker({ theme, place = '' }) {useLanguage();
  if (!theme?.character) return null;
  return <span aria-hidden="true" className={`character-sticker sticker-${place}`}><ThemeCharacter kind={theme.character} /></span>;
}

export function CharacterBackdrop({ theme }) {useLanguage();
  if (!theme?.character) return null;
  return <div className="character-backdrop" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span className={`backdrop-friend friend-${i % 4}`} key={i}><ThemeCharacter kind={theme.character} /><i>{i % 2 ? '♡' : '✦'}</i></span>)}</div>;
}

export function CharacterWelcome({ theme }) {useLanguage();
  if (!theme?.character) return null;
  return <div className="character-welcome"><div className="welcome-friends" aria-hidden="true"><span className="welcome-friend little"><ThemeCharacter kind={theme.character} /></span><span className="welcome-friend big"><ThemeCharacter kind={theme.character} /></span><span className="welcome-friend little reverse"><ThemeCharacter kind={theme.character} /></span><i>✧</i></div><div className="welcome-copy"><small>{tr("YOUR LITTLE MONEY BUDDY")}</small><strong>{theme.title}{tr(" menemani harimu.")}</strong><p>{tr("Catatan kecil hari ini, mimpi besar suatu hari nanti.")}</p></div><div className="welcome-doodles" aria-hidden="true"><span>♡</span><CharacterSticker theme={theme} place="welcome" /><span>✦</span></div></div>;
}
