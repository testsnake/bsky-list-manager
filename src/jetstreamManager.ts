import { Jetstream, JetstreamAccountEvent, JetstreamCommitEvent, JetstreamEvent, JetstreamIdentityEvent } from "./jetstream";
import { ModelManager } from "./models/modelManager";
import { logger } from "./logger";


export interface JetstreamManagerOptions {
    jetstreamUrl?: string;
    concurrency?: number;
    modelManager: ModelManager;
}

export class JetstreamManager {
    private js: Jetstream;
    private modelManager: ModelManager;
    

    constructor(param: JetstreamManagerOptions) {
        this.modelManager = param.modelManager;
        const collections = this.modelManager.getSubscribedJetstreamCollections();
        logger.info(`Subscribing to Jetstream collections: ${collections.join(", ")}`);
        this.js = new Jetstream({
            url: param.jetstreamUrl,
            collections: collections,
            concurrency: param.concurrency,
            onEvent: async (event) => {
                try {
                    await this.handleEvent(event);
                } catch (err) {
                    logger.error(`Error handling event: ${err}`);
                }
            },
            onError: (err) => {
                logger.error(`Jetstream error: ${err}`);
            },
            onReconnect: (attempt, delay) => {
                logger.info(`Reconnecting to Jetstream (attempt ${attempt}, delay ${delay}ms)`);
            },
            onQueueSize: (size) => {
                // logger.info(`Jetstream queue size: ${size}`);
            },
        });
    }
    handleEvent(event: JetstreamEvent) {
        if (event.kind === "commit") {
            return this.handleCommitEvent(event);
        } else if (event.kind === "identity") {
            return this.handleIdentityEvent(event);
        } else if (event.kind === "account") {
            return this.handleAccountEvent(event);
        }
    }
    handleAccountEvent(event: JetstreamAccountEvent) {
        // logger.error(`Received account event, which is not currently handled: ${JSON.stringify(event)}`);
        // throw new Error("Method not implemented.");
        if (!event.account.active) {
            return;
        }

        // return this.modelManager.scanProfileWithOnlyDid({ did: event.did });
    }
    handleIdentityEvent(event: JetstreamIdentityEvent) {
        // logger.error(`Received identity event, which is not currently handled: ${JSON.stringify(event)}`);
        // throw new Error("Method not implemented.");

        return this.modelManager.scanProfileWithOnlyDid({ did: event.did });
        
    }
    handleCommitEvent(event: JetstreamCommitEvent) {
        if (event.commit.collection === "app.bsky.actor.profile") {
            return this.modelManager.scanProfile({
                did: event.did,
                user: event.commit.record as any, // TODO: type this properly
            });
        }
    }

    start() {
        this.js.start();
    }

    stop() {
        this.js.stop();
    }
        

    
}