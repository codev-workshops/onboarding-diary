import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './toast';

function Trigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Saved')}>ok</button>
      <button onClick={() => toast.error('Boom')}>fail</button>
    </div>
  );
}

describe('ToastProvider / useToast', () => {
  it('renders success and error toasts on demand', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('ok'));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    await userEvent.click(screen.getByText('fail'));
    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('no-ops without a provider', async () => {
    render(<Trigger />);
    await userEvent.click(screen.getByText('ok'));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
