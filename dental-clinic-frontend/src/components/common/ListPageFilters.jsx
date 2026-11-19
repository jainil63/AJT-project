import React, { useMemo } from 'react';
import SearchFilterBar from './SearchFilterBar';
import FilterModal from './FilterModal';
import { countActiveFilters } from '../../utils/filterUtils';
import {
  EMPTY_DATE_FILTERS,
  DATE_FILTER_KEYS,
  DATE_FILTER_FIELDS,
} from '../../utils/listPageFilters';

/**
 * Standard search bar + filter modal for list/master pages.
 * Pass exportModule + exportRows for built-in Excel export (all filtered rows).
 */
const ListPageFilters = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  isFilterOpen,
  onFilterOpen,
  onFilterClose,
  filterData,
  setFilterData,
  filteredCount,
  totalCount,
  recordLabel = 'records',
  filterTitle = 'Filters',
  fields,
  emptyFilters = EMPTY_DATE_FILTERS,
  filterKeys: filterKeysProp = DATE_FILTER_KEYS,
  onApply,
  className = '',
  children,
  exportModule,
  exportColumns,
  exportLabel,
  exportRows,
  exportFilename,
  onExport,
  customFieldsModule,
}) => {
  const resolvedFields = useMemo(
    () => fields || DATE_FILTER_FIELDS,
    [fields]
  );

  const activeFilterCount = useMemo(
    () => countActiveFilters(filterData, filterKeysProp),
    [filterData, filterKeysProp]
  );

  return (
    <>
      <SearchFilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        onFilterClick={onFilterOpen}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredCount}
        totalCount={totalCount}
        recordLabel={recordLabel}
        className={className}
        exportModule={exportModule}
        exportColumns={exportColumns}
        exportLabel={exportLabel}
        exportRows={exportRows}
        exportFilename={exportFilename}
        onExport={onExport}
        customFieldsModule={customFieldsModule}
      >
        {children}
      </SearchFilterBar>

      <FilterModal
        isOpen={isFilterOpen}
        onClose={onFilterClose}
        title={filterTitle}
        filterData={filterData}
        setFilterData={setFilterData}
        emptyFilters={emptyFilters}
        activeFilterCount={activeFilterCount}
        filteredCount={filteredCount}
        totalCount={totalCount}
        fields={resolvedFields}
        resultLabel={recordLabel}
        onApply={onApply}
      />
    </>
  );
};

export default ListPageFilters;
