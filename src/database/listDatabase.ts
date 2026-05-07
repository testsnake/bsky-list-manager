import Database from "better-sqlite3";
import { ListEntry } from "../types";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "lists.db");

class ListDatabase {
    private readonly db: Database.Database;
    private static instance: ListDatabase | null = null;

    private constructor() {
        this.db = new Database(DB_PATH);
        this.db.pragma("journal_mode = WAL");
        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS list_entries (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                did     TEXT    NOT NULL,
                listUri TEXT    NOT NULL,
                rkey    TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_list_entries_did ON list_entries (did);
        `);
    }

    public static getInstance(): ListDatabase {
        if (!ListDatabase.instance) {
            ListDatabase.instance = new ListDatabase();
        }
        return ListDatabase.instance;
    }

    public insert(entry: Omit<ListEntry, "id">): ListEntry {
        const stmt = this.db.prepare(`
            INSERT INTO list_entries (did, listUri, rkey)
            VALUES (@did, @listUri, @rkey)
        `);

        const result = stmt.run(entry);

        return {
            id: result.lastInsertRowid as number,
            ...entry,
        };
    }

    public removeById(id: number): boolean {
        const stmt = this.db.prepare(`
            DELETE FROM list_entries WHERE id = ?
        `);
        const result = stmt.run(id);
        return result.changes > 0;
    }

    public removeByDid(did: string): number {
        const stmt = this.db.prepare(`
            DELETE FROM list_entries WHERE did = ?
        `);
        const result = stmt.run(did);
        return result.changes;
    }

    public removeByDidAndListUri(did: string, listUri: string): number {
        const stmt = this.db.prepare(`
            DELETE FROM list_entries WHERE did = ? AND listUri = ?
        `);
        const result = stmt.run(did, listUri);
        return result.changes;
    }

    public removeByRkeyAndListUri(rkey: string, listUri: string): number {
        const stmt = this.db.prepare(`
            DELETE FROM list_entries WHERE rkey = ? AND listUri = ?
        `);
        const result = stmt.run(rkey);
        return result.changes;
    }

    public findByDid(did: string): ListEntry[] {
        const stmt = this.db.prepare<[string], ListEntry>(`
            SELECT id, did, listUri, rkey FROM list_entries WHERE did = ?
        `);
        return stmt.all(did);
    }

    public findById(id: number): ListEntry | undefined {
        const stmt = this.db.prepare<[number], ListEntry>(`
            SELECT id, did, listUri, rkey FROM list_entries WHERE id = ?
        `);
        return stmt.get(id);
    }

    public findByListUri(listUri: string): ListEntry[] {
        const stmt = this.db.prepare<[string], ListEntry>(`
            SELECT id, did, listUri, rkey FROM list_entries WHERE listUri = ?
        `);
        return stmt.all(listUri);
    }

    public findByDidAndListUri(did: string, listUri: string): ListEntry[] {
        const stmt = this.db.prepare<[string, string], ListEntry>(`
            SELECT id, did, listUri, rkey FROM list_entries WHERE did = ? AND listUri = ?
        `);
        return stmt.all(did, listUri);
    }

    public getAll(): ListEntry[] {
        const stmt = this.db.prepare<[], ListEntry>(`
            SELECT id, did, listUri, rkey FROM list_entries
        `);
        return stmt.all();
    }

    public close(): void {
        this.db.close();
        ListDatabase.instance = null;
    }
}

export default ListDatabase;