/**
 * useApiForm — routing a FastAPI 422 onto the field that caused it.
 *
 * The highest-value test in the set, because it covers a *seam*: both sides
 * already worked and were never connected. `getFieldErrors` has its own tests
 * in `__tests__/api/client.test.js` and was imported by zero screens;
 * `react-hook-form` was a declared dependency with zero imports.
 *
 * The 422 fixtures below are shaped exactly like the ones that file already
 * uses, so the two suites cannot drift apart on what FastAPI actually sends.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider } from 'react-hook-form';
import { useApiForm } from '@/hooks/useApiForm';
import { toApiError } from '@/api/errors';

/** An axios-shaped rejection, as the interceptor would produce. */
function axiosError(status, data) {
  return {
    isAxiosError: true,
    response: { status, data, headers: {} },
    config: { url: '/admin/admins' },
    message: `Request failed with status code ${status}`,
  };
}

function validationError(fields) {
  return axiosError(422, {
    detail: fields.map(([loc, msg]) => ({ loc, msg, type: 'value_error' })),
  });
}

/** A minimal harness exposing the hook's behaviour through the DOM. */
function Harness({ onSubmit, onSuccess, fieldAliases, defaultValues }) {
  const form = useApiForm({
    onSubmit,
    onSuccess,
    fieldAliases,
    defaultValues: defaultValues ?? { name: '', ward_id: '', phone: '' },
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.submit}>
        <label htmlFor="name">Name</label>
        <input id="name" {...form.register('name')} />
        <p data-testid="err-name">{form.formState.errors.name?.message ?? ''}</p>

        <label htmlFor="ward_id">Ward</label>
        <input id="ward_id" {...form.register('ward_id')} />
        <p data-testid="err-ward">{form.formState.errors.ward_id?.message ?? ''}</p>

        <p data-testid="err-root">{form.serverError ?? ''}</p>

        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

async function submit() {
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('useApiForm', () => {
  it('lands a field error on the control that caused it', async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      toApiError(validationError([[['body', 'ward_id'], 'field required']])),
    );
    render(<Harness onSubmit={onSubmit} />);

    await submit();

    await waitFor(() =>
      expect(screen.getByTestId('err-ward')).toHaveTextContent('field required'),
    );
    // Placed on the field, so nothing needs to also shout at the top.
    expect(screen.getByTestId('err-root')).toHaveTextContent('');
  });

  it('places several field errors at once', async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      toApiError(
        validationError([
          [['body', 'name'], 'must not be blank'],
          [['body', 'ward_id'], 'field required'],
        ]),
      ),
    );
    render(<Harness onSubmit={onSubmit} />);

    await submit();

    await waitFor(() =>
      expect(screen.getByTestId('err-name')).toHaveTextContent('must not be blank'),
    );
    expect(screen.getByTestId('err-ward')).toHaveTextContent('field required');
  });

  it('sends an error for a field this form does not own to the top', async () => {
    // Otherwise it vanishes and a failed save looks like a successful one.
    const onSubmit = jest.fn().mockRejectedValue(
      toApiError(validationError([[['body', 'district_id'], 'field required']])),
    );
    render(<Harness onSubmit={onSubmit} />);

    await submit();

    await waitFor(() => expect(screen.getByTestId('err-root')).not.toHaveTextContent(''));
    expect(screen.getByTestId('err-name')).toHaveTextContent('');
  });

  it('sends a non-422 to the top with the server’s own message', async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      toApiError(axiosError(409, { detail: 'That phone number is already registered' })),
    );
    render(<Harness onSubmit={onSubmit} />);

    await submit();

    await waitFor(() =>
      expect(screen.getByTestId('err-root')).toHaveTextContent(
        'That phone number is already registered',
      ),
    );
  });

  it('remaps a server key through fieldAliases', async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      toApiError(validationError([[['body', 'ward'], 'field required']])),
    );
    render(<Harness onSubmit={onSubmit} fieldAliases={{ ward: 'ward_id' }} />);

    await submit();

    await waitFor(() =>
      expect(screen.getByTestId('err-ward')).toHaveTextContent('field required'),
    );
  });

  it('clears a previous server error on the next submit', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValueOnce(toApiError(axiosError(500, { detail: 'Server exploded' })))
      .mockResolvedValueOnce({ id: 'ok' });

    render(<Harness onSubmit={onSubmit} />);

    await submit();
    await waitFor(() => expect(screen.getByTestId('err-root')).toHaveTextContent('Server exploded'));

    await submit();
    await waitFor(() => expect(screen.getByTestId('err-root')).toHaveTextContent(''));
  });

  it('calls onSuccess with the result and the submitted values', async () => {
    const onSuccess = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue({ id: 'new-admin' });

    render(<Harness onSubmit={onSubmit} onSuccess={onSuccess} defaultValues={{ name: 'Rita', ward_id: 'w1', phone: '' }} />);
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      { id: 'new-admin' },
      expect.objectContaining({ name: 'Rita', ward_id: 'w1' }),
    );
  });

  it('does not call onSuccess when the request failed', async () => {
    const onSuccess = jest.fn();
    const onSubmit = jest.fn().mockRejectedValue(toApiError(axiosError(500, {})));

    render(<Harness onSubmit={onSubmit} onSuccess={onSuccess} />);
    await submit();

    await waitFor(() => expect(screen.getByTestId('err-root')).not.toHaveTextContent(''));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not throw out of submit when the request fails', async () => {
    // An unhandled rejection here would surface as a console error in every
    // form the moment the backend returns anything but 2xx.
    const onSubmit = jest.fn().mockRejectedValue(toApiError(axiosError(500, {})));
    render(<Harness onSubmit={onSubmit} />);

    await expect(submit()).resolves.not.toThrow();
  });
});
