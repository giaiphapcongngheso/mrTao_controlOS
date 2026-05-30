/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Column } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // Augment ColumnMeta so every column can carry layout & behaviour hints
  // consumed by CustomTable, TreeTable, and other table wrappers.
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Fixed or percentage width applied to colgroup / header / cell styles. */
    width?: number | string;
    /** Minimum width used during manual column resizing. */
    minWidth?: number | string;
    /** Maximum width used during manual column resizing. */
    maxWidth?: number | string;
    /** Pin the column to the left or right edge of the scrollable area. */
    sticky?: 'left' | 'right';
    /** When false the cell text is truncated with ellipsis instead of wrapping. */
    wrap?: boolean;
    /**
     * Render a filter control inside the collapsible filter row.
     * Can be a static ReactNode or a render function receiving the column instance.
     */
    filterElement?: ReactNode | ((column: Column<TData, TValue>) => ReactNode);
  }
}
