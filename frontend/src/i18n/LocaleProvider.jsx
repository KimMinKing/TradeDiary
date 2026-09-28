import { useEffect, useMemo, useState } from 'react';
import { LocaleContext } from './localeContext';
import { translateText } from './translations';

const originalText = new WeakMap(); const originalAttrs = new WeakMap();
const SKIP = 'script,style,textarea,[contenteditable="true"],[data-no-translate],[data-user-content],.community-post-body,.community-comment p';

const localizeNode = (root, language) => {
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { const parent=node.parentElement;if(!parent||parent.closest(SKIP))return;let source=originalText.get(node);if(source==null){source=node.nodeValue;originalText.set(node,source);}else{const oldTrimmed=source.trim();const localized=source.replace(oldTrimmed,translateText(oldTrimmed,language));if(node.nodeValue!==source&&node.nodeValue!==localized){source=node.nodeValue;originalText.set(node,source);}}const trimmed=source.trim();if(!trimmed)return;const translated=translateText(trimmed,language);const next=source.replace(trimmed,translated);if(node.nodeValue!==next)node.nodeValue=next; });
  const elements = root.querySelectorAll?.('[placeholder],[title],[aria-label]') || [];
  elements.forEach(el=>{if(el.closest(SKIP))return;let map=originalAttrs.get(el);if(!map){map={};originalAttrs.set(el,map);}['placeholder','title','aria-label'].forEach(attr=>{if(!el.hasAttribute(attr))return;if(!(attr in map))map[attr]=el.getAttribute(attr);el.setAttribute(attr,translateText(map[attr],language));});});
};

export function LocaleProvider({ children }) {
  const [language,setLanguage]=useState(()=>localStorage.getItem('preferredLanguage')||'en');
  useEffect(()=>{const update=e=>setLanguage(e.detail||localStorage.getItem('preferredLanguage')||'en');window.addEventListener('languageChange',update);return()=>window.removeEventListener('languageChange',update);},[]);
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dataset.language=language;localizeNode(document.body,language);const observer=new MutationObserver(records=>records.forEach(record=>{if(record.type==='characterData')localizeNode(record.target.parentElement||document.body,language);record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)localizeNode(node,language);else if(node.parentElement)localizeNode(node.parentElement,language);});}));observer.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>observer.disconnect();},[language]);
  const value=useMemo(()=>({language,locale:language==='ko'?'ko-KR':'en-US',t:value=>translateText(value,language),formatDate:(value,options)=>new Intl.DateTimeFormat(language==='ko'?'ko-KR':'en-US',options).format(new Date(value)),formatNumber:(value,options)=>new Intl.NumberFormat(language==='ko'?'ko-KR':'en-US',options).format(value)}),[language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
