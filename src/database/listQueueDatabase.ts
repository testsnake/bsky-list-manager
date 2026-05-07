import Database from "better-sqlite3";
import { ListQueueEntry, ListOperation } from "../types";
import { getDb } from "./base";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "queue.db");

class ListQueueDatabase {
    private readonly db = getDb();
    private static instance: ListQueueDatabase | null = null;

    private constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS list_queue (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                listUri  TEXT    NOT NULL,
                operation INTEGER NOT NULL,
                did      TEXT,
                rkey     TEXT,
                nextTry  INTEGER NOT NULL,
                tries    INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_list_queue_nextTry ON list_queue (nextTry);
            CREATE INDEX IF NOT EXISTS idx_list_queue_listUri ON list_queue (listUri);
        `);
    }

    public static getInstance(): ListQueueDatabase {
        if (!ListQueueDatabase.instance) {
            ListQueueDatabase.instance = new ListQueueDatabase();
        }
        return ListQueueDatabase.instance;
    }

    public enqueue(entry: Omit<ListQueueEntry, "id">): ListQueueEntry {
        const stmt = this.db.prepare(`
            INSERT INTO list_queue (listUri, operation, did, rkey, nextTry, tries)
            VALUES (@listUri, @operation, @did, @rkey, @nextTry, @tries)
        `);

        const result = stmt.run(entry);
        return { id: result.lastInsertRowid as number, ...entry };
    }

    public dequeue(id: number): boolean {
        const stmt = this.db.prepare(`DELETE FROM list_queue WHERE id = ?`);
        return stmt.run(id).changes > 0;
    }

    public recordAttempt(id: number, nextTry: number): boolean {
        const stmt = this.db.prepare(`
            UPDATE list_queue SET tries = tries + 1, nextTry = ? WHERE id = ?
        `);
        return stmt.run(nextTry, id).changes > 0;
    }

    public getDue(now: number, limit = 100): ListQueueEntry[] {
        const stmt = this.db.prepare(`
            SELECT * FROM list_queue
            WHERE nextTry <= ?
            ORDER BY nextTry ASC
            LIMIT ?
        `);
        return stmt.all(now, limit) as ListQueueEntry[];
    }

    public findById(id: number): ListQueueEntry | undefined {
        const stmt = this.db.prepare(`SELECT * FROM list_queue WHERE id = ?`);
        return stmt.get(id) as ListQueueEntry | undefined;
    }

    public findByListUri(listUri: string): ListQueueEntry[] {
        const stmt = this.db.prepare(`SELECT * FROM list_queue WHERE listUri = ?`);
        return stmt.all(listUri) as ListQueueEntry[];
    }

    public removeByListUri(listUri: string, operation?: ListOperation): number {
        const stmt = operation !== undefined
            ? this.db.prepare(`DELETE FROM list_queue WHERE listUri = ? AND operation = ?`)
            : this.db.prepare(`DELETE FROM list_queue WHERE listUri = ?`);

        const result = operation !== undefined
            ? stmt.run(listUri, operation)
            : stmt.run(listUri);

        return result.changes;
    }

    public getAll(): ListQueueEntry[] {
        return this.db.prepare(`SELECT * FROM list_queue`).all() as ListQueueEntry[];
    }

    public close(): void {
        this.db.close();
        ListQueueDatabase.instance = null;
    }
}

export default ListQueueDatabase;