import React from 'react';
import {Mail} from 'lucide-react';
import {APP_NAME,SUPPORT_EMAIL} from './brand.mjs';
import {tr} from './language.mjs';
import {useLanguage} from './Language.jsx';
import './service-info.css';

export default function ServiceInfo(){
 useLanguage();
 return <div className="service-info"><span className="service-copyright">© {new Date().getFullYear()} {APP_NAME}. {tr('Hak cipta dilindungi.')}</span><a className="service-email" href={'mailto:'+SUPPORT_EMAIL}><Mail size={14} aria-hidden="true"/><span>{tr('Bantuan layanan:')} <strong>{SUPPORT_EMAIL}</strong></span></a></div>;
}
