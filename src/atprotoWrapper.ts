/* wrapper that accounts for rate limits and retries automatically */

import { AtpAgent } from "@atproto/api";
import { ListEntry, ListQueueEntry, RepoWrites } from "./types";
import ListDatabase from "./database/listDatabase";
import UserDatabase from "./database/userDatabase";
import { logger } from "./logger";


export class AtprotoWrapper {
    private agent: AtpAgent;

    constructor(agent: AtpAgent) {
        this.agent = agent;
    }


    async processQueueItems(items: ListQueueEntry[]): Promise<void> {
        let writes: RepoWrites = [];
        
        const repodid = this.agent.session?.did;

        for (const item of items) {
            // convert queue item to repo write
            if (item.operation === 0) {
                writes.push({
                    $type: "com.atproto.repo.applyWrites#create",
                    collection: "app.bsky.graph.listitem",
                    value: {
                        repo: repodid,
                        collection: "app.bsky.graph.listitem",
                        value: {
                            $type: "app.bsky.graph.listitem",
                            list: item.listUri,
                            subject: item.did,
                            createdAt: new Date().toISOString(),
                    }
                    },
                });

            } else if (item.operation === 1) {
                throw new Error("update operation not supported");
            } else if (item.operation === 2) {
                writes.push({
                    $type: "com.atproto.repo.applyWrites#delete",
                    collection: "app.bsky.graph.listitem",
                    rkey: item.rkey!,
                });
            }
        }

        const res = await this.agent.com.atproto.repo.applyWrites(
            { repo: repodid!, writes }
        );

        if (!res.success) {
            throw new Error("Failed to apply writes");
        }

        if (res.data.results?.length !== items.length) {
            throw new Error("mismatch between queue items and write results");
        }

        const listDb = ListDatabase.getInstance();
        const userDb = UserDatabase.getInstance();

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const result = res.data.results[i];

            if (item.operation === 0 && result.$type === "com.atproto.repo.applyWrites#createResult") {
                if (!item.did) {
                    throw new Error("missing did for create operation");
                }
                const did = item.did;
                const listUri = item.listUri;
                const rkey = result.uri.split("/").pop()!;
                listDb.insert({ did, listUri, rkey });
                userDb.incrementOnAnyList(did);
            } else if (item.operation === 1 && result.$type === "com.atproto.repo.applyWrites#updateResult") {
                throw new Error("update operation not supported, unreachable code");
            } else if (item.operation === 2 && result.$type === "com.atproto.repo.applyWrites#deleteResult") {
                if (!item.rkey) {
                    throw new Error("missing rkey or did for delete operation");
                }
                const rkey = item.rkey;
                listDb.removeByRkeyAndListUri(rkey, item.listUri);
                if (item.did) {
                    userDb.decrementOnAnyList(item.did);
                }
            } else {
                throw new Error("mismatch between queue item and write result");
            }

            if (item.did) {
                userDb.touchLastUpdate(item.did);
            }
        }

        logger.debug(`Successfully processed ${items.length} queue items`);
    }

}