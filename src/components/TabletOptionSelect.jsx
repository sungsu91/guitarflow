import {useId,useRef} from 'react';
import {ChevronDown,Check,X} from 'lucide-react';
import {useLanguage} from '../i18n/react.jsx';

// Tablet presentation of a controlled select. The calling feature owns its
// options and selection; phones and desktops keep their existing controls.
export default function TabletOptionSelect({label,value,options,onChange}) {
  const id=useId();
  const dialog=useRef(null);
  const language=useLanguage();
  const selected=options.find(option=>String(option.id)===String(value));
  return <span className="tabletOptionSelect">
    <button type="button" aria-label={label} aria-haspopup="dialog" aria-controls={id}
      onClick={()=>{dialog.current.showModal();dialog.current.querySelector('[aria-selected="true"]')?.focus();}}>
      <span>{selected?.label}</span><ChevronDown size={20}/>
    </button>
    <dialog ref={dialog} id={id} className="tabletOptionDialog" aria-label={label}
      onClick={event=>{if(event.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.current.close();}}}>
      <header><strong>{label}</strong><button type="button" aria-label={language==='ko'?'닫기':'Close'} onClick={()=>dialog.current.close()}><X size={22}/></button></header>
      <div role="listbox" aria-label={label} onKeyDown={event=>{
        if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
        event.preventDefault();const items=[...event.currentTarget.querySelectorAll('[role="option"]')];
        const index=items.indexOf(document.activeElement);
        items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
      }}>
        {options.map(option=><button type="button" key={option.id} role="option" aria-selected={String(option.id)===String(value)}
          onClick={()=>{onChange(option.id);dialog.current.close();}}><span>{option.label}</span>{String(option.id)===String(value)&&<Check size={22}/>}</button>)}
      </div>
    </dialog>
  </span>;
}
