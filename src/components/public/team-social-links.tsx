'use client';

import { useState } from 'react';
import type { TeamMember } from '@/lib/landing/team-members';

interface Props {
  member: TeamMember;
}

export function TeamSocialLinks({ member }: Props) {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    if (!member.email || member.email === '#' || member.email === '') return;
    
    // Strip mailto: if it was accidentally left in
    const cleanEmail = member.email.replace('mailto:', '');
    
    const handleCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanEmail).then(handleCopied).catch(err => {
        console.error('Clipboard API failed', err);
        fallbackCopy(cleanEmail, handleCopied);
      });
    } else {
      fallbackCopy(cleanEmail, handleCopied);
    }
  };

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        onSuccess();
      } else {
        console.error('Fallback copy failed');
      }
    } catch (err) {
      console.error('Fallback copy error', err);
    }
    
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex items-center gap-3 mt-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out invisible group-hover:visible">
      {member.facebook && (
        <a href={member.facebook !== '#' ? member.facebook : '#'} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-[#418bff] hover:bg-[#418bff]/10 hover:border-[#418bff]/30" aria-label={`${member.name}'s Facebook`}>
          <i className="fab fa-facebook-f" />
        </a>
      )}
      
      {member.email && (
        <div className="relative flex flex-col items-center">
          <button onClick={copyEmail} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-[#418bff] hover:bg-[#418bff]/10 hover:border-[#418bff]/30" aria-label={`Copy email of ${member.name}`}>
            <i className={copied ? "fas fa-check text-green-400" : "fas fa-envelope"} />
          </button>
          
          {copied && (
            <span className="absolute -top-8 text-[0.65rem] font-bold text-white bg-black/60 px-2 py-1 rounded-md backdrop-blur-md whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
              Copied!
            </span>
          )}
        </div>
      )}

      {member.github && (
        <a href={member.github !== '#' ? member.github : '#'} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/30" aria-label={`${member.name}'s GitHub`}>
          <i className="fab fa-github" />
        </a>
      )}
    </div>
  );
}
