import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function testDb() {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../drizzle/0000_fuzzy_goblin_queen.sql', import.meta.url), 'utf8'));
  return {
    database,
    prepare(sql) {
      const statement = database.prepare(sql);
      const prepared = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() { return statement.get(...this.args) ?? null; },
        async run() { const result = statement.run(...this.args); return {meta: {changes: Number(result.changes)}}; },
      };
      return prepared;
    },
  };
}
