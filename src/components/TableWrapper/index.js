import React from 'react';

/**
 * Wraps a table in a horizontally scrollable container for better mobile UX.
 * Use in MDX: <TableWrapper>| Col1 | Col2 |...</TableWrapper>
 */
export default function TableWrapper({children}) {
  return <div className="table-scroll-wrapper">{children}</div>;
}
