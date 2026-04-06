import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { usePagination, useSorting } from '@/store/uiStore';
import './DataTable.css';

/**
 * Reusable DataTable Component
 * Displays tabular data with sorting and pagination support
 * 
 * @component
 * @example
 * const columns = [
 *   { key: 'id', label: 'ID', width: '100px' },
 *   { key: 'title', label: 'Title', sortable: true },
 *   { key: 'status', label: 'Status', sortable: true },
 * ];
 * 
 * const data = [
 *   { id: 1, title: 'Issue 1', status: 'Open' },
 *   { id: 2, title: 'Issue 2', status: 'Closed' },
 * ];
 * 
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   totalItems={100}
 *   onPageChange={handlePageChange}
 * />
 */
const DataTable = ({
  columns = [],
  data = [],
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onSort,
  isLoading = false,
  emptyMessage = 'No data available',
  rowKey = 'id',
  onRowClick,
}) => {
  const { page, pageSize: storePageSize, nextPage, prevPage } = usePagination();
  const { sortField, sortOrder, setSortField, setSortOrder } = useSorting();

  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPageSize = pageSize || storePageSize;

  const handleSort = (columnKey, isSortable) => {
    if (!isSortable) return;

    let newOrder = 'asc';
    if (sortField === columnKey && sortOrder === 'asc') {
      newOrder = 'desc';
    }

    setSortField(columnKey);
    setSortOrder(newOrder);
    onSort?.(columnKey, newOrder);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      prevPage();
      onPageChange?.(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      nextPage();
      onPageChange?.(page + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="data-table">
        <div className="data-table__loading">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="data-table">
        <div className="data-table__empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead className="data-table__head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`data-table__header ${column.sortable ? 'data-table__header--sortable' : ''}`}
                style={{ width: column.width || 'auto' }}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div className="data-table__header-content">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <span className="data-table__sort-icon">
                      {sortField === column.key && (sortOrder === 'asc' ? '↑' : '↓')}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__body">
          {data.map((row, index) => (
            <tr
              key={row[rowKey] || index}
              className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={`${row[rowKey]}-${column.key}`}
                  className="data-table__cell"
                  style={{ width: column.width || 'auto' }}
                >
                  {column.render ? column.render(row[column.key], row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalItems > currentPageSize && (
        <div className="data-table__pagination">
          <button
            className="data-table__pagination-button"
            disabled={page <= 1}
            onClick={handlePrevPage}
          >
            ← Previous
          </button>
          <span className="data-table__pagination-info">
            Page {page} of {totalPages} ({totalItems} total)
          </span>
          <button
            className="data-table__pagination-button"
            disabled={page >= totalPages}
            onClick={handleNextPage}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

DataTable.propTypes = {
  /** Column definitions */
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    sortable: PropTypes.bool,
    width: PropTypes.string,
    render: PropTypes.func,
  })),
  /** Table data rows */
  data: PropTypes.arrayOf(PropTypes.object),
  /** Total items count (for pagination) */
  totalItems: PropTypes.number,
  /** Page size */
  pageSize: PropTypes.number,
  /** Page change handler */
  onPageChange: PropTypes.func,
  /** Sort handler */
  onSort: PropTypes.func,
  /** Loading state */
  isLoading: PropTypes.bool,
  /** Empty state message */
  emptyMessage: PropTypes.string,
  /** Key to use as row identifier */
  rowKey: PropTypes.string,
  /** Row click handler */
  onRowClick: PropTypes.func,
};

export default DataTable;
