import * as React from 'react';
import { useDispatch, useTrackedState } from '../../store';
import { Button, Divider, IconPlus, IconTrash, Modal } from '@supabase/ui';
import FilterDropdown from './filter';
import SortDropdown from './sort';
import StatusLabel from './StatusLabel';

type HeaderProps = {
  onAddColumn?: () => void;
  onAddRow?: () => void;
  headerActions?: React.ReactNode;
};

const Header: React.FC<HeaderProps> = ({
  onAddColumn,
  onAddRow,
  headerActions,
}) => {
  const state = useTrackedState();
  const dispatch = useDispatch();
  const { selectedRows, rows: allRows, editable } = state;

  const [visible, setVisible] = React.useState(false);


  const onRowsDelete = () => {
    const rowIdxs = Array.from(selectedRows) as number[];
    const rows = allRows.filter(x => rowIdxs.includes(x.idx));
    const { error } = state.rowService!.delete(rows);
    if (error) {
      if (state.onError) state.onError(error);
    } else {
      dispatch({ type: 'REMOVE_ROWS', payload: { rowIdxs } });
      dispatch({
        type: 'SELECTED_ROWS_CHANGE',
        payload: { selectedRows: new Set<React.Key>() },
      });
    }
  };

  const renderNewColumn = (onAddColumn?: () => void) => {
    if (!onAddColumn) return null;
    return (
      <Button type="text" onClick={onAddColumn}>
        New Column
      </Button>
    );
  };

  const renderAddRow = (onAddRow?: () => void) => {
    if (!onAddRow) return null;
    return (
      <Button
        className="sb-grid-header__inner__insert-row"
        style={{ padding: '4px 8px' }}
        icon={<IconPlus size="tiny" />}
        onClick={onAddRow}
      >
        Insert row
      </Button>
    );
  };

  const renderDeleteRow = (selectedRowsLength: number, renderDeleteButton: boolean | undefined) => {
    if (!renderDeleteButton) return null;
    if(selectedRowsLength < 1) return null;
    return (
      <Button 
        danger={true}
        style={{ padding: '4px 8px' }}
        icon={<IconTrash size="tiny" />}
        onClick={() => setVisible(true)}
      >
        Delete {selectedRowsLength > 1 ? `${selectedRowsLength} rows`: `${selectedRowsLength} row`}
      </Button>
    );
  }

  return (
    <div className="sb-grid-header">
      <div className="sb-grid-header__inner">
        <FilterDropdown />
        <SortDropdown />
        <Divider type="vertical" className="sb-grid-header__inner__divider" />
        {renderNewColumn(onAddColumn)}
        {renderAddRow(onAddRow)}
        {renderDeleteRow(selectedRows.size, editable)}
      </div>
      <div className="sb-grid-header__inner">
        {headerActions}
        <StatusLabel />
      </div>
      <Modal
        closable
        title={`Are you sure you want to delete ${selectedRows.size > 1 ? 'these rows': 'this row'}?`}
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          onRowsDelete();
        }}
      />
    </div>
  );
};
export default Header;
