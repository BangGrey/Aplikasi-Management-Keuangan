import React from 'react';
import {Bot} from 'lucide-react';
import ThemeCharacter from './ThemeCharacter.jsx';
import Avatar from './Avatar.jsx';
import {tr} from './language.mjs';
import {useLanguage} from './Language.jsx';
import './chat-avatars.css';
export function AssistantAvatar({theme}){
 return <span className="assistant-character-avatar" aria-hidden="true">{theme?.character?<ThemeCharacter kind={theme.character}/>:<Bot size={23}/>}</span>;
}
export default function ChatBubble({role='assistant',theme,name,userName,userAvatar,children}){
 useLanguage();const assistant=role==='assistant';
 return <div className={'chat-row '+role}><span className="chat-message-avatar">{assistant?<AssistantAvatar theme={theme}/>:<Avatar src={userAvatar} label={userName}/>}</span><div className={'chat-message '+role}><span className="chat-message-author">{assistant?name||tr('Asisten keuangan'):userName||tr('Kamu')}</span>{children}</div></div>;
}
