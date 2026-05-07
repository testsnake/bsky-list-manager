import AtpAgent, { AppBskyActorProfile } from "@atproto/api";
import { AtprotoWrapper } from "../atprotoWrapper";
import { ListEntry } from "../types";
import { logger } from "../logger";

export interface userTestParam {
    listManager?: AtprotoWrapper;
    user: AppBskyActorProfile.Record;
    did: string;
    handle?: string;
}

export abstract class BaseProfileModel {
    constructor() {}

    async consumeProfileUpdate(param: userTestParam): Promise<void> {
        const entry = await this.testProfile(param);
        if (entry) {
            param.listManager?.addUserToListQueue(entry.did, entry.listUri);
            logger.info(`User ${entry.did} matched model ${this.constructor.name}, added to queue for list ${entry.listUri}`);
        }
    }

    abstract testProfile(param: userTestParam): Promise<ListEntry | null>;

    getSubscribedJetstreamCollections(): string[] {
        return ["app.bsky.actor.profile"];
    }
}
