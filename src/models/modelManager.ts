import { BaseProfileModel, userTestParam } from "./baseProfileModel";
import { defaultAvatarModel } from "./defaultAvatarModel";
import { regexModel } from "./regexModel";
import config from "../../config.json";
import { parseRegex } from "../utils";
import { rexegModelConfig } from "../types";
import { logger } from "../logger";
import { AtprotoWrapper } from "../atprotoWrapper";
import { AppBskyActorProfile } from "@atproto/api";

export class ModelManager {
    private models: BaseProfileModel[] = [];
    private AtprotoWrapper: AtprotoWrapper;

    // TODO: make this dynamic, i dont wanna rn
    constructor(atprotoWrapper: AtprotoWrapper) {
        this.AtprotoWrapper = atprotoWrapper;
        this.initializeModels();
    }

    private initializeModels() {
        const defaultAvatarListUri = config.avatarModel.listUri ?? "";
        if (defaultAvatarListUri) {
            this.models.push(new defaultAvatarModel(defaultAvatarListUri));
        }

        for (const regexModelConfig of config.regexModel.filters ?? []) {
            if (regexModelConfig.listUri && regexModelConfig.regex) {
                const regex = parseRegex(regexModelConfig.regex);

                const filter: rexegModelConfig = {
                    listUri: regexModelConfig.listUri,
                    regex,
                    inHandle: regexModelConfig.inHandle,
                    inBio: regexModelConfig.inBio,
                    inDisplayName: regexModelConfig.inDisplayName,
                    inPronouns: regexModelConfig.inPronouns,
                };

                this.models.push(new regexModel(filter));
            } else {
                logger.warn(`Invalid regex model configuration, skipping: ${JSON.stringify(regexModelConfig)}`);
            }
        }
    }

    async scanProfile(param: userTestParam): Promise<void> {
        if (!param.listManager) {
            param.listManager = this.AtprotoWrapper;
        }
        return Promise.all(this.models.map((model) => model.consumeProfileUpdate(param)))
            .then(() => {})
            .catch((err) => {
                logger.error(`Error scanning profile for ${param.did}: ${err} - ${err.stack}`);
            });
    }

    async scanProfileWithOnlyDid(param: { did: string }, attempts = 0): Promise<void> {
        try {
            const agent = this.AtprotoWrapper.getAgent();
            const response = await agent.com.atproto.repo.getRecord({
                repo: param.did,
                collection: "app.bsky.actor.profile",
                rkey: "self",
            });

            const profile = response.data.value as AppBskyActorProfile.Record;
            await this.scanProfile({ did: param.did, user: profile, listManager: this.AtprotoWrapper });
        } catch (err) {
            

            // odds are that the account was just created and the profile record doesn't exist yet, so we can retry a few times with some delay
            if (attempts < 5) {
                const delay = 1000 * Math.pow(2, attempts); // exponential backoff
                // logger.debug(`Retrying fetch for ${param.did} in ${delay}ms (attempt ${attempts + 1})`);
                setTimeout(() => {
                    this.scanProfileWithOnlyDid(param, attempts + 1);
                }, delay);
            } else {
                logger.error(`Failed to fetch profile for ${param.did} after ${attempts} attempts: ${err}`);
            }
        }
    }

    getSubscribedJetstreamCollections(): string[] {
        const collections = new Set<string>();
        this.models.forEach((model) => {
            model.getSubscribedJetstreamCollections().forEach((col) => collections.add(col));
        });
        return Array.from(collections);
    }
}
