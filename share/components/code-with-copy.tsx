import { Button } from '../ui';
import { CheckCircle, Clipboard, ClipboardCheck, Copy } from 'lucide-react';
import { useState } from 'react';

interface CodeWithCopyProps {
  code: string;
  prefix?: string;
  className?: string;
  textClassName?: string;
  copyIcon?: 'copy' | 'clipboard';
  copiedIcon?: 'check' | 'clipboard-check';
  size?: 'sm' | 'md' | 'lg';
  copyable?: boolean;
}

export function CodeWithCopy({
  code,
  prefix = '#',
  className,
  textClassName,
  copyIcon = 'clipboard',
  copiedIcon = 'check',
  size = 'md',
  copyable = true,
}: CodeWithCopyProps) {
  const [copied, setCopied] = useState(false);
  const codeText = `${prefix}${code}`;

  const sizeConfig = {
    sm: {
      text: 'text-[10px]',
      icon: 'h-3 w-3',
      button: 'h-4 w-4',
    },
    md: {
      text: 'text-[12px]',
      icon: 'h-3 w-3',
      button: 'h-5 w-5',
    },
    lg: {
      text: 'text-sm',
      icon: 'h-4 w-4',
      button: 'h-6 w-6',
    },
  };

  const config = sizeConfig[size];

  const handleCopy = async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const renderCopyIcon = () => {
    if (copyIcon === 'clipboard') {
      return <Clipboard className={config.icon} />;
    }
    return <Copy className={config.icon} />;
  };

  const renderCopiedIcon = () => {
    if (copiedIcon === 'clipboard-check') {
      return <ClipboardCheck className={`${config.icon} text-green-600`} />;
    }
    return <CheckCircle className={`${config.icon} text-green-600`} />;
  };

  return (
    <div className={`group flex items-center gap-1 ${className || ''}`} role="presentation">
      <div className={`${config.text} text-gray-500 ${textClassName || ''}`}>{codeText}</div>
      {code && copyable && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={`${config.button} text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCopy();
          }}
        >
          {copied ? renderCopiedIcon() : renderCopyIcon()}
        </Button>
      )}
    </div>
  );
}
