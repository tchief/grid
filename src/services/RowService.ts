import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseGridQueue } from '../constants';
import { Dictionary, SupaTable } from '../types';

class RowService {
  constructor(protected table: SupaTable, protected client: SupabaseClient) {
    if (!table) throw new Error('Table definition is required.');
    if (!client) throw new Error('Supabase client is required.');
  }

  fetchAll() {
    return this.client.from(this.table.name).select();
  }

  fetchPage(
    page: number,
    rowsPerPage: number,
    filters: {
      clause: string;
      columnId: string | number;
      condition: string;
      filterText: string;
    }[],
    sorts: { columnId: string | number; order: string }[]
  ) {
    const pageFromZero = page > 0 ? page - 1 : page;
    const from = pageFromZero * rowsPerPage;
    const to = (pageFromZero + 1) * rowsPerPage - 1;
    let request = this.client
      .from(this.table.name)
      .select('*', { count: 'exact' })
      .range(from, to);
    // Filter first
    for (let idx in filters) {
      const filter = filters[idx];
      if (filter.filterText == '') continue;
      const column = this.table.columns.find(x => x.id === filter.columnId);
      if (!column) continue;

      const columnName = column.name;
      switch (filter.condition) {
        case 'is':
          const filterText = filter.filterText.toLowerCase();
          if (filterText == 'null') request = request.is(columnName, null);
          else if (filterText == 'true') request = request.is(columnName, true);
          else if (filterText == 'false')
            request = request.is(columnName, false);
          break;
        case 'in':
          const filterValues = filter.filterText.split(',').map(x => x.trim());
          request = request.in(columnName, filterValues);
          break;
        default:
          request = request.filter(
            columnName,
            // @ts-ignore
            filter.condition.toLowerCase(),
            filter.filterText
          );
          break;
      }
    }
    // Then sort
    for (let idx = 0; idx < sorts.length; idx++) {
      const sort = sorts[idx];
      const column = this.table.columns.find(x => x.id === sort.columnId);
      if (!column) continue;

      const columnName = column.name;
      const sortAsc = sort.order.toLowerCase() === 'asc';
      request = request.order(columnName, { ascending: sortAsc });
    }

    return request;
  }

  create(value: Dictionary<any>) {
    SupabaseGridQueue.add(async () => {
      const res = await this.client.from(this.table.name).insert(value);
      console.log('insert row', res);
      // TODO: how to handle error
      // if (res.error)
    });
  }

  update(value: Dictionary<any>): { error?: string } {
    const { primaryKey, error } = this._getPrimaryKey();
    if (error) return { error };

    SupabaseGridQueue.add(async () => {
      const res = await this.client
        .from(this.table.name)
        .update(value)
        .match({ [primaryKey!]: value[primaryKey!] });
      console.log('update row', res);
      // TODO: how to handle error
      // if (res.error)
    });

    return {};
  }
  delete(rowIds: number[] | string[]): { error?: string } {
    const { primaryKey, error } = this._getPrimaryKey();
    if (error) return { error };

    SupabaseGridQueue.add(async () => {
      const res = await this.client
        .from(this.table.name)
        .delete()
        .in(primaryKey!, rowIds);
      console.log('delete row', res);
      // TODO: how to handle error
      // if (res.error)
    });

    return {};
  }

  _getPrimaryKey(): { primaryKey?: string; error?: string } {
    // find primary key
    const primaryKeys = this.table.columns.filter(x => x.isIdentity);
    if (!primaryKeys || primaryKeys.length == 0)
      return { error: "Can't find primary key" };
    else if (primaryKeys.length > 1)
      return { error: 'Not support multi primary keys' };
    return { primaryKey: primaryKeys[0].name };
  }
}
export default RowService;
