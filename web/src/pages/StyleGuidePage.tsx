import { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Dropdown } from '../components/Dropdown';
import { Input, Textarea } from '../components/Input';

/**
 * Live rendering of every component state required by
 * devin_context/design-system/STYLE_GUIDE.md — used as the visual proof that the
 * application implements the design system rather than approximating it.
 */
const SHAPE_TOKENS = [
  { token: '--color-primary', note: 'Primary color' },
  { token: '--color-primary-hover', note: 'Primary hover' },
  { token: '--color-primary-light', note: 'Light accent' },
  { token: '--color-surface-muted', note: 'Page background' },
  { token: '--color-border-special', note: 'Borders in special cases' },
  { token: '--color-surface', note: 'Cards and inputs' },
] as const;

const TEXT_TOKENS = [
  '--color-text-heading',
  '--color-text-muted',
  '--color-text-link',
  '--color-text-on-primary-muted',
  '--color-danger',
  '--color-text-disabled',
] as const;

export const StyleGuidePage = () => {
  const [fruit, setFruit] = useState<string | null>(null);
  const [email, setEmail] = useState('derrick-craw@email.com');

  return (
    <div className="stack stack--lg">
      <header className="page__header">
        <div>
          <h1>Style guide</h1>
          <p className="muted">
            Every control below is the same component the app uses, driven by the tokens in
            devin_context/design-system.
          </p>
        </div>
      </header>

      <Card title="Colors">
        <div className="stack">
          <p className="overline">Shape UI elements</p>
          <div className="swatches">
            {SHAPE_TOKENS.map((entry) => (
              <div
                key={entry.token}
                className="swatch"
                style={{
                  background: `var(${entry.token})`,
                  color:
                    entry.token === '--color-surface' || entry.token === '--color-surface-muted'
                      ? 'var(--color-text-heading)'
                      : 'var(--color-text-on-primary)',
                }}
              >
                {entry.token}
                <br />
                {entry.note}
              </div>
            ))}
          </div>
          <p className="overline">Font colors</p>
          <div className="swatches">
            {TEXT_TOKENS.map((token) => (
              <div
                key={token}
                className="swatch"
                style={{ background: `var(${token})`, color: 'var(--color-text-on-primary)' }}
              >
                {token}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid--two">
        <Card title="Buttons">
          <div className="stack">
            <p className="overline">Primary</p>
            <div className="actions">
              <Button>Save entry</Button>
              <Button disabled>Inactive</Button>
            </div>
            <p className="overline">Primary rounded</p>
            <div className="actions">
              <Button variant="primaryRounded" icon="+">
                New entry
              </Button>
            </div>
            <p className="overline">Secondary (on a primary surface only)</p>
            <div className="onPrimary actions">
              <Button variant="secondary">Default</Button>
              <Button variant="secondary">Hover me</Button>
            </div>
            <p className="overline">Tertiary</p>
            <div className="actions">
              <Button variant="tertiary">Cancel</Button>
              <Button variant="tertiary" size="sm">
                Edit entry
              </Button>
            </div>
            <p className="overline">Quaternary (destructive)</p>
            <div className="actions">
              <Button variant="quaternary">Delete entry</Button>
            </div>
          </div>
        </Card>

        <Card title="Typography">
          <div className="stack">
            <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Open Sans | 20px - regular/bold
            </p>
            <p style={{ fontSize: 'var(--font-size-md)' }}>
              Open Sans | 16px - regular/semibold/bold
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>Open Sans | 14px - regular/semibold</p>
            <p className="caption">Open Sans | 12px - regular</p>
            <p className="overline">Open sans | 10px all caps - semibold</p>
          </div>
        </Card>
      </div>

      <div className="grid--two">
        <Card title="Dropdown">
          <Dropdown
            label="Category"
            value={fruit}
            placeholder="Select an option"
            options={[
              { value: 'setup', label: 'Setup' },
              { value: 'training', label: 'Training' },
              { value: 'documentation', label: 'Documentation' },
              { value: 'shadowing', label: 'Shadowing' },
              { value: 'archived', label: 'Archived (disabled)', disabled: true },
            ]}
            onChange={setFruit}
          />
        </Card>

        <Card title="Input">
          <div className="stack">
            <Input label="Default" type="password" placeholder="Enter your password" />
            <Input
              label="Error"
              placeholder="Enter your email address"
              error="Please enter your email address"
            />
            <Input
              label="Active"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input label="Disabled" value="Not editable" disabled />
            <Textarea label="Multi-line" placeholder="Add any details" hint="Optional." />
          </div>
        </Card>
      </div>
    </div>
  );
};
