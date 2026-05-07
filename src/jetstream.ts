import WebSocket from "ws";

const DEFAULT_JETSTREAM_URL = "wss://jetstream2.us-west.bsky.network/subscribe";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const DEFAULT_CONCURRENCY = 5;

export interface JetstreamCommitEvent {
    did: string;
    time_us: number;
    kind: "commit";
    commit: {
        rev: string;
        operation: "create" | "update" | "delete";
        collection: string;
        rkey: string;
        cid?: string;
        record?: Record<string, unknown>;
    };
}

export interface JetstreamIdentityEvent {
    did: string;
    time_us: number;
    kind: "identity";
    identity: {
        did: string;
        handle: string;
        seq: number;
        time: string;
    };
}

export interface JetstreamAccountEvent {
    did: string;
    time_us: number;
    kind: "account";
    account: {
        active: boolean;
        did: string;
        seq: number;
        time: string;
    };
}

export type JetstreamEvent = JetstreamCommitEvent | JetstreamIdentityEvent | JetstreamAccountEvent;

export interface JetstreamOptions {
    url?: string;
    collections?: string[];
    /** Max number of events processed concurrently. Defaults to 5. */
    concurrency?: number;
    onEvent: (event: JetstreamEvent) => Promise<void> | void;
    onError?: (error: Error) => void;
    onReconnect?: (attempt: number, delay: number) => void;
    onQueueSize?: (size: number) => void;
}

export class Jetstream {
    private readonly url: string;
    private readonly concurrency: number;
    private readonly onEvent: JetstreamOptions["onEvent"];
    private readonly onError: NonNullable<JetstreamOptions["onError"]>;
    private readonly onReconnect: NonNullable<JetstreamOptions["onReconnect"]>;
    private readonly onQueueSize: NonNullable<JetstreamOptions["onQueueSize"]>;

    private ws: WebSocket | null = null;
    private stopped = false;
    private reconnectAttempt = 0;
    private cursor: number | undefined = undefined;

    // Concurrency state
    private queue: JetstreamEvent[] = [];
    private active = 0;

    constructor(options: JetstreamOptions) {
        const baseUrl = options.url ?? DEFAULT_JETSTREAM_URL;
        const params = new URLSearchParams();

        for (const collection of options.collections ?? []) {
            params.append("wantedCollections", collection);
        }

        const qs = params.toString();
        this.url = qs ? `${baseUrl}?${qs}` : baseUrl;

        this.concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
        this.onEvent = options.onEvent;
        this.onError = options.onError ?? ((e) => console.error("[Jetstream]", e));
        this.onReconnect = options.onReconnect ?? ((attempt, delay) =>
            console.log(`[Jetstream] reconnecting in ${delay}ms (attempt ${attempt})…`)
        );
        this.onQueueSize = options.onQueueSize ?? (() => {});
    }

    start(): void {
        if (this.ws) return;
        this.stopped = false;
        this.connect();
    }

    stop(): void {
        this.stopped = true;
        this.ws?.close();
        this.ws = null;
        console.log("[Jetstream] stopped");
    }

    get queueSize(): number {
        return this.queue.length;
    }

    get activeCount(): number {
        return this.active;
    }

    private buildUrl(): string {
        if (this.cursor === undefined) return this.url;
        const separator = this.url.includes("?") ? "&" : "?";
        return `${this.url}${separator}cursor=${this.cursor}`;
    }

    private connect(): void {
        if (this.stopped) return;

        const url = this.buildUrl();
        console.log(`[Jetstream] connecting to ${url}`);
        const ws = new WebSocket(url);
        this.ws = ws;

        ws.on("open", () => {
            console.log("[Jetstream] connected");
            this.reconnectAttempt = 0;
        });

        ws.on("message", (data) => {
            let event: JetstreamEvent;
            try {
                event = JSON.parse(data.toString()) as JetstreamEvent;
            } catch {
                return;
            }

            this.cursor = event.time_us;
            this.enqueue(event);
        });

        ws.on("close", (code) => {
            console.warn(`[Jetstream] connection closed (code=${code})`);
            this.scheduleReconnect();
        });

        ws.on("error", (error) => {
            this.onError(error instanceof Error ? error : new Error(String(error)));
        });
    }

    private enqueue(event: JetstreamEvent): void {
        this.queue.push(event);
        this.onQueueSize(this.queue.length);
        this.drain();
    }

    private drain(): void {
        while (this.active < this.concurrency && this.queue.length > 0) {
            const event = this.queue.shift()!;
            this.active++;
            this.onQueueSize(this.queue.length);

            Promise.resolve()
                .then(() => this.onEvent(event))
                .catch((err) => {
                    this.onError(err instanceof Error ? err : new Error(String(err)));
                })
                .finally(() => {
                    this.active--;
                    this.drain();
                });
        }
    }

    private scheduleReconnect(): void {
        if (this.stopped) return;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
        this.onReconnect(this.reconnectAttempt, delay);
        this.reconnectAttempt++;
        setTimeout(() => this.connect(), delay);
    }
}