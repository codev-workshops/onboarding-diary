import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TAGS_MAX_COUNT } from '@onboarding-diary/shared';

import { TagInput } from './TagInput.js';

function Harness({ initial = [] as string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <>
      <TagInput value={tags} onChange={setTags} />
      <output data-testid="value">{tags.join('|')}</output>
    </>
  );
}

describe('TagInput', () => {
  it('normalises on Enter and on comma, and ignores duplicates and blanks', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText('Add a tag and press Enter');

    await user.type(input, '  Setup  {Enter}');
    await user.type(input, 'VPN,');
    await user.type(input, 'setup{Enter}');
    await user.type(input, '   {Enter}');

    expect(screen.getByTestId('value')).toHaveTextContent('setup|vpn');
    expect(input).toHaveValue('');
  });

  it('removes a tag with its button and with Backspace on an empty draft', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['setup', 'vpn']} />);

    await user.click(screen.getByRole('button', { name: 'Remove tag setup' }));
    expect(screen.getByTestId('value')).toHaveTextContent('vpn');

    await user.type(screen.getByPlaceholderText('Add a tag and press Enter'), '{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });

  it('stops accepting tags at the shared limit', async () => {
    const user = userEvent.setup();
    const initial = Array.from({ length: TAGS_MAX_COUNT }, (_unused, index) => `tag${index}`);
    render(<Harness initial={initial} />);

    const input = screen.getByPlaceholderText('Tag limit reached');
    expect(input).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove tag tag0' }));
    expect(screen.getByPlaceholderText('Add a tag and press Enter')).toBeEnabled();
  });
});
