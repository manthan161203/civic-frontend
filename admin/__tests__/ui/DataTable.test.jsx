/**
 * DataTable — the component 27 screens are about to be built on.
 *
 * The tests worth having are the ones encoding decisions, not markup:
 * the sort-mode invariant, the three-way loading/error/empty precedence, and
 * page-scoped selection.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '@/components/ui/DataTable';
import { ApiError } from '@/api/errors';

const ROWS = [
  { id: 'a', name: 'Alpha', ward: 'Ward 1', count: 3 },
  { id: 'b', name: 'Bravo', ward: null, count: 1 },
  { id: 'c', name: 'Charlie', ward: 'Ward 2', count: 2 },
];

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'ward', header: 'Ward' },
  { key: 'count', header: 'Count', sortable: true },
];

function table(props = {}) {
  return render(
    <DataTable rows={ROWS} columns={COLUMNS} getRowId={(r) => r.id} {...props} />,
  );
}

/** Body rows only — excludes the header row. */
function bodyRows() {
  const [, ...rest] = screen.getAllByRole('row');
  return rest;
}

describe('DataTable — the sort invariant', () => {
  it('throws on client sorting combined with server pagination', () => {
    // Sorting the current page while the user reads it as sorting the whole
    // result set is a correctness bug, so it fails the build rather than
    // relying on everyone remembering the convention.
    const boom = () =>
      table({
        sortMode: 'client',
        pagination: { page: 1, pageSize: 20, total: 100, onPageChange: jest.fn() },
      });

    expect(boom).toThrow(/sorts only the rows currently on screen/i);
  });

  it('renders no sort affordance at all when sortMode is none', () => {
    table({ sortMode: 'none' });
    // A column marked sortable must still show nothing — otherwise the arrow
    // promises something the endpoint cannot deliver.
    expect(screen.queryByRole('button', { name: /count/i })).not.toBeInTheDocument();
  });

  it('sorts in place when the whole list is loaded', async () => {
    const user = userEvent.setup();
    table({ sortMode: 'client' });

    await user.click(screen.getByRole('button', { name: /count/i }));
    expect(bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent))
      .toEqual(['Bravo', 'Charlie', 'Alpha']);

    await user.click(screen.getByRole('button', { name: /count/i }));
    expect(bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent))
      .toEqual(['Alpha', 'Charlie', 'Bravo']);
  });

  it('reports its sort state to assistive technology', async () => {
    const user = userEvent.setup();
    table({ sortMode: 'client' });

    await user.click(screen.getByRole('button', { name: /count/i }));
    expect(screen.getByRole('columnheader', { name: /count/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('calls onSortChange in server mode instead of reordering locally', async () => {
    const user = userEvent.setup();
    const onSortChange = jest.fn();
    table({ sortMode: 'server', onSortChange });

    await user.click(screen.getByRole('button', { name: /count/i }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'count', dir: 'asc' });
    // Order is the server's job; the rows must not move on their own.
    expect(bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent))
      .toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});

describe('DataTable — loading, error and empty precedence', () => {
  it('renders exactly skeletonRows placeholder rows while loading', () => {
    table({ loading: true, skeletonRows: 5 });
    expect(bodyRows()).toHaveLength(5);
  });

  it('shows the error panel, not the empty state, when a request failed', () => {
    // The bug this prevents: `rows.length === 0` is true for a failed request
    // too, so screens render "No issues found" on top of an outage.
    table({
      rows: [],
      error: new ApiError({ kind: 'server', message: 'Boom', status: 500, retryable: true }),
      empty: <p>NOTHING HERE</p>,
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('NOTHING HERE')).not.toBeInTheDocument();
  });

  it('shows the empty state only once the request has succeeded with no rows', () => {
    table({ rows: [], loading: false, empty: <p>NOTHING HERE</p> });
    expect(screen.getByText('NOTHING HERE')).toBeInTheDocument();
  });

  it('does not show the empty state while still loading', () => {
    table({ rows: [], loading: true, empty: <p>NOTHING HERE</p> });
    expect(screen.queryByText('NOTHING HERE')).not.toBeInTheDocument();
  });

  it('offers retry only when retrying could work', async () => {
    const onRetry = jest.fn();

    const { unmount } = table({
      rows: [],
      onRetry,
      error: new ApiError({ kind: 'forbidden', message: 'Nope', status: 403, retryable: false }),
    });
    // A 403 will fail identically forever; a retry button there is a lie.
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    unmount();

    table({
      rows: [],
      onRetry,
      error: new ApiError({ kind: 'server', message: 'Boom', status: 503, retryable: true }),
    });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides pagination while loading or errored', () => {
    const pagination = { page: 1, pageSize: 20, total: 100, onPageChange: jest.fn() };

    const { unmount } = table({ loading: true, pagination });
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
    unmount();

    table({ pagination });
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });
});

describe('DataTable — selection', () => {
  it('reports row ids, not indices', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    table({ selectable: true, selectedIds: [], onSelectionChange });

    await user.click(screen.getByRole('checkbox', { name: /select row 2/i }));
    expect(onSelectionChange).toHaveBeenCalledWith(['b']);
  });

  it('select-all covers only the rows on this page', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    // Something from another page is already selected and must survive.
    table({ selectable: true, selectedIds: ['from-page-2'], onSelectionChange });

    await user.click(screen.getByRole('checkbox', { name: /select all rows on this page/i }));

    expect(onSelectionChange).toHaveBeenCalledWith(['from-page-2', 'a', 'b', 'c']);
  });

  it('marks the header checkbox indeterminate on a partial selection', () => {
    // Without this, "1 of 3 selected" renders identically to "0 selected" —
    // exactly what the current issues table does.
    table({ selectable: true, selectedIds: ['a'], onSelectionChange: jest.fn() });

    const all = screen.getByRole('checkbox', { name: /select all rows on this page/i });
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
  });

  it('checks the header box only when every row on the page is selected', () => {
    table({ selectable: true, selectedIds: ['a', 'b', 'c'], onSelectionChange: jest.fn() });

    const all = screen.getByRole('checkbox', { name: /select all rows on this page/i });
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
  });

  it('deselects the page without touching other pages', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    table({
      selectable: true,
      selectedIds: ['a', 'b', 'c', 'from-page-2'],
      onSelectionChange,
    });

    await user.click(screen.getByRole('checkbox', { name: /select all rows on this page/i }));
    expect(onSelectionChange).toHaveBeenCalledWith(['from-page-2']);
  });
});

describe('DataTable — cells and row clicks', () => {
  it('renders an em dash for a null value rather than the text "null"', () => {
    table();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('passes the row and its index to a custom renderer', () => {
    table({
      columns: [{ key: 'name', header: 'Name', render: (row, i) => `${i}:${row.name}` }],
    });
    expect(screen.getByText('0:Alpha')).toBeInTheDocument();
  });

  it('fires onRowClick for a click on an inert cell', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    table({ onRowClick });

    await user.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it('does NOT fire onRowClick from an interactive element inside a cell', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    const onDelete = jest.fn();

    table({
      onRowClick,
      columns: [
        { key: 'name', header: 'Name' },
        {
          key: 'actions',
          header: '',
          render: (row) => (
            <button type="button" onClick={() => onDelete(row.id)}>
              Delete
            </button>
          ),
        },
      ],
    });

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    expect(onDelete).toHaveBeenCalledWith('a');
    // Otherwise the detail modal opens behind every Delete press.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('does not fire onRowClick from the selection checkbox', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();
    table({ onRowClick, selectable: true, selectedIds: [], onSelectionChange: jest.fn() });

    await user.click(screen.getByRole('checkbox', { name: /select row 1/i }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('gives the table an accessible description', () => {
    table({ caption: 'Civic issues' });
    expect(screen.getByRole('table')).toHaveAccessibleDescription('Civic issues');
  });
});
