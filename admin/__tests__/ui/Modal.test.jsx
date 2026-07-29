/**
 * Modal — the behaviours none of the ~27 hand-written overlays had.
 *
 * These are not decorative. Each one corresponds to something a user could hit
 * in the console today:
 *
 *   - No Escape handler, on any of them.
 *   - No focus trap, and no focus restoration, so closing a dialog dropped the
 *     caret at the top of the document.
 *   - Backdrop close on any click, which lets a text-selection drag out of the
 *     panel destroy an unsaved form.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '@/components/ui/Modal';

function open(props = {}) {
  const onClose = jest.fn();
  const utils = render(
    <Modal open onClose={onClose} title="Assign worker" {...props}>
      <input aria-label="first" />
      <input aria-label="second" />
      <button type="button">Save</button>
    </Modal>,
  );
  return { onClose, ...utils };
}

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={jest.fn()} title="Hidden">
        <p>body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog', () => {
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // aria-labelledby must actually resolve — pointing at a missing id is the
    // usual way this is "implemented".
    expect(dialog).toHaveAccessibleName('Assign worker');
  });

  it('closes on Escape', async () => {
    const { onClose } = open();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog on open', async () => {
    open();
    // Focus is set on the next animation frame, once the panel is in the
    // document — so this has to wait rather than assert synchronously.
    await waitFor(() =>
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true),
    );
  });

  it('returns focus to the trigger on close', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <Modal open onClose={jest.fn()} title="T">
        <button type="button">inside</button>
      </Modal>,
    );

    rerender(
      <Modal open={false} onClose={jest.fn()} title="T">
        <button type="button">inside</button>
      </Modal>,
    );

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('wraps Tab from the last focusable back to the first', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');

    // Let the mount-time focus land first. Without this the component's
    // requestAnimationFrame fires *after* the explicit focus() below and
    // silently moves the caret, so the assertion measures the wrong element.
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    const focusables = [...dialog.querySelectorAll('button, input')];
    const last = focusables[focusables.length - 1];

    last.focus();
    await user.tab();

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('wraps Shift+Tab from the first focusable back to the last', async () => {
    const user = userEvent.setup();
    open();

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    const focusables = [...dialog.querySelectorAll('button, input')];
    focusables[0].focus();
    await user.tab({ shift: true });

    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });

  it('closes when the whole click lands on the backdrop', () => {
    const { onClose } = open();
    const backdrop = screen.getByRole('dialog').parentElement;

    fireEvent.mouseDown(backdrop);
    fireEvent.mouseUp(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when a drag starts inside the panel and ends on the backdrop', () => {
    // The regression this component exists for. Selecting text in a form and
    // releasing slightly outside the panel closed every current modal and
    // destroyed whatever had been typed.
    const { onClose } = open();
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;

    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on a click that lands inside the panel', () => {
    const { onClose } = open();
    const dialog = screen.getByRole('dialog');

    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('dismissible={false} blocks Escape, the backdrop and the close button', async () => {
    const { onClose } = open({ dismissible: false });
    const dialog = screen.getByRole('dialog');

    await userEvent.keyboard('{Escape}');
    fireEvent.mouseDown(dialog.parentElement);
    fireEvent.mouseUp(dialog.parentElement);

    expect(onClose).not.toHaveBeenCalled();
    // The ✕ is gone entirely rather than present-but-inert.
    expect(screen.queryByRole('button', { name: /close dialog/i })).not.toBeInTheDocument();
  });

  it('locks background scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Modal open onClose={jest.fn()} title="T">
        <p>b</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={jest.fn()} title="T">
        <p>b</p>
      </Modal>,
    );
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('renders through a portal, not inside its parent', () => {
    // The current modals are nested inside <main className="overflow-y-auto">,
    // where a `fixed` child is a containing-block hazard.
    const { container } = render(
      <Modal open onClose={jest.fn()} title="Portalled">
        <p>body</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
