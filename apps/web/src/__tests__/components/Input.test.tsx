import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test-utils';
import { Input, Select, Textarea } from '@/components/ui/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input id="email" label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input id="email" label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<Input id="email" error="Required" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-300');
  });

  it('accepts user input', async () => {
    const onChange = vi.fn();
    render(<Input id="email" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'hello');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders options', () => {
    render(<Select id="sel" options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select id="sel" label="Choose" options={options} />);
    expect(screen.getByLabelText('Choose')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea id="bio" label="Bio" />);
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Textarea id="bio" error="Too short" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });
});
