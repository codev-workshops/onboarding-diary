import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Current policy summary shown as helper text (min length). */
  hint?: string;
}

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';

/** Generates a 16-char password from a cryptographically strong source. */
function generatePassword(length = 16): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CHARSET[v % CHARSET.length]).join('');
}

/**
 * Password input with usability affordances (docs/ASSUMPTIONS.md §5): show/hide,
 * generate a strong password, copy it, and a policy hint. Enforcement stays on
 * the server's `PasswordPolicy`; this never logs or persists plaintext.
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  hint = 'Minimum 8 characters.',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore silently.
    }
  };

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Generate password"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copy password"
          disabled={!value}
          onClick={() => void copy()}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
