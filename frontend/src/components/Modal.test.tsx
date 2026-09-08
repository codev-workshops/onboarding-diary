import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { Modal } from './Modal';

function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? (
        <Modal title="Example" titleId="example-title" onClose={() => setOpen(false)}>
          <input aria-label="First" />
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </Modal>
      ) : null}
    </>
  );
}

test('focuses the first control, traps Tab and restores focus on close', async () => {
  const user = userEvent.setup();
  render(<Harness />);

  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByLabelText('First')).toHaveFocus();

  await user.tab();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.tab();
  expect(screen.getByLabelText('First')).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
});
