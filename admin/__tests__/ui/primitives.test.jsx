/**
 * Button, ConfirmDialog, Pagination and the status registry.
 *
 * Small surfaces, but each carries one decision that a screen author would
 * otherwise have to rediscover.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Button from '@/components/ui/Button';
import { ConfirmProvider, useConfirm } from '@/components/ui/ConfirmDialog';
import Pagination, { pageWindow } from '@/components/ui/Pagination';
import { resolveTone, humanise, STATUS_TONES } from '@/components/ui/statusTones';
import { StatusBadge } from '@/components/ui/Badge';

/* ── Button ───────────────────────────────────────────────────────────────── */

describe('Button', () => {
  it('defaults to type="button"', () => {
    // A bare <button> inside a <form> submits it. Now that the console has real
    // forms, an action button in a modal footer would submit on click.
    render(<Button>Escalate</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('submits when explicitly asked to', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is disabled and aria-busy while loading, and swallows clicks', async () => {
    const onClick = jest.fn();
    render(<Button isLoading onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps its children in the DOM while loading so the width cannot change', () => {
    // The old LoadingButton replaced the label with loadingText, so a button
    // resized under the cursor at the exact moment it was clicked.
    render(<Button isLoading loadingText="Creating…">Create Sub-Admin</Button>);
    expect(screen.getByText('Create Sub-Admin')).toBeInTheDocument();
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });

  it('accepts the legacy `loading` alias used by existing call sites', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

/* ── ConfirmDialog ────────────────────────────────────────────────────────── */

function ConfirmHarness({ options, onResult }) {
  const confirm = useConfirm();
  return (
    // Named distinctly from any button the dialog renders, so a query for
    // the confirm action cannot accidentally match the trigger.
    <button type="button" onClick={async () => onResult(await confirm(options))}>
      Open confirm
    </button>
  );
}

function renderConfirm(options) {
  const onResult = jest.fn();
  render(
    <ConfirmProvider>
      <ConfirmHarness options={options} onResult={onResult} />
    </ConfirmProvider>,
  );
  return onResult;
}

describe('ConfirmDialog', () => {
  const BASE = { title: 'Delete this issue?', tone: 'danger', confirmLabel: 'Delete' };

  it('resolves true on confirm', async () => {
    const user = userEvent.setup();
    const onResult = renderConfirm(BASE);

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false on cancel', async () => {
    const user = userEvent.setup();
    const onResult = renderConfirm(BASE);

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('resolves false on Escape rather than leaving the caller awaiting forever', async () => {
    const user = userEvent.setup();
    const onResult = renderConfirm(BASE);

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('does not autofocus the destructive action', async () => {
    const user = userEvent.setup();
    renderConfirm(BASE);

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    const dialog = await screen.findByRole('dialog');

    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    // A stray Enter must not delete.
    expect(document.activeElement).not.toHaveTextContent('Delete');
  });

  it('requireTyping keeps confirm disabled until the string matches exactly', async () => {
    const user = userEvent.setup();
    renderConfirm({ ...BASE, requireTyping: 'DELETE', confirmLabel: 'Confirm delete' });

    await user.click(screen.getByRole('button', { name: 'Open confirm' }));
    const confirmButton = await screen.findByRole('button', { name: 'Confirm delete' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText(/type/i), 'delete');
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByLabelText(/type/i));
    await user.type(screen.getByLabelText(/type/i), 'DELETE');
    expect(confirmButton).toBeEnabled();
  });
});

/* ── Pagination ───────────────────────────────────────────────────────────── */

describe('Pagination', () => {
  const base = { page: 1, pageSize: 20, total: 140, onPageChange: jest.fn() };

  it('renders nothing when there is nothing to paginate', () => {
    const { container } = render(<Pagination {...base} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('always keeps the last page reachable', () => {
    // blocked-tasks capped the list at five numbered pages and never advanced
    // past the fifth, stranding everything beyond it.
    const window = pageWindow(1, 40);
    expect(window).toContain(40);
    expect(window).toContain(1);
  });

  it('keeps the current page and its neighbours in the window', () => {
    const window = pageWindow(20, 40);
    expect(window).toEqual(expect.arrayContaining([1, 19, 20, 21, 40]));
  });

  it('does not insert a gap where the pages are contiguous', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('marks the current page for assistive technology', () => {
    render(<Pagination {...base} page={3} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
  });

  it('disables previous on the first page and next on the last', () => {
    const { unmount } = render(<Pagination {...base} page={1} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    unmount();

    render(<Pagination {...base} page={7} />);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('reports the range in human terms', () => {
    render(<Pagination {...base} page={2} />);
    expect(screen.getByText(/21–40 of 140/)).toBeInTheDocument();
  });
});

/* ── statusTones ──────────────────────────────────────────────────────────── */

describe('statusTones', () => {
  const VALID_TONES = ['neutral', 'primary', 'success', 'warning', 'danger', 'info', 'accent'];

  it('maps every registered value to a real tone and a written label', () => {
    for (const [kind, registry] of Object.entries(STATUS_TONES)) {
      for (const [value, entry] of Object.entries(registry)) {
        expect(VALID_TONES).toContain(entry.tone);
        expect(entry.label).toBeTruthy();
        // "in_progress" is not a label a person should read.
        expect(entry.label).not.toMatch(/_/);
        expect(`${kind}.${value}`).toBeTruthy();
      }
    }
  });

  it('never returns undefined for an unknown value', () => {
    // Every one of the twelve maps this replaces ended in `|| 'bg-gray-100'`,
    // a fallback each author learned by shipping `undefined` into a className.
    const result = resolveTone('issueStatus', 'some_new_backend_status');
    expect(result.tone).toBe('neutral');
    expect(result.label).toBe('Some new backend status');
  });

  it('uses the caller’s fallback for a null value', () => {
    expect(resolveTone('priority', null, 'Not set').label).toBe('Not set');
    expect(resolveTone('priority', '', 'Not set').label).toBe('Not set');
  });

  it('has no `critical` priority, because the backend enum has none', () => {
    // The admin filter offered it, so it always matched zero rows — and omitted
    // `urgent`, the genuinely highest priority.
    expect(Object.keys(STATUS_TONES.priority)).toEqual(['urgent', 'high', 'medium', 'low']);
  });

  it('humanises snake_case and kebab-case', () => {
    expect(humanise('in_progress')).toBe('In progress');
    expect(humanise('ward-admin')).toBe('Ward admin');
    expect(humanise('')).toBe('');
  });

  it('renders a readable label through StatusBadge', () => {
    render(<StatusBadge kind="issueStatus" value="in_progress" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});
