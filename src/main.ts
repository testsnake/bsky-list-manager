import "dotenv/config";
import { AtprotoWrapper } from "./atprotoWrapper";
import { AtpAgent } from "@atproto/api";
import { ModelManager } from "./models/modelManager";
import { JetstreamManager } from "./jetstreamManager";
import { logger } from "./logger";

async function main() {
    const agent = new AtpAgent({ service: process.env.ACCOUNT_LIST_MANAGER_PDS_URL ?? "https://bsky.social" });
    agent.login({
        identifier: process.env.ACCOUNT_LIST_MANAGER_USERNAME ?? "",
        password: process.env.ACCOUNT_LIST_MANAGER_PASSWORD ?? "",
    }).then(() => {
        logger.info("Logged in to AT Protocol successfully");
        const atprotoWrapper = new AtprotoWrapper(agent);
        const modelManager = new ModelManager(atprotoWrapper);
        const jetstreamManager = new JetstreamManager({ modelManager });

        jetstreamManager.start();
    }).catch(err => {
        logger.error(`Failed to log in to AT Protocol: ${err}`);
    });
}

main().catch(err => {
    logger.error(`Unexpected error in main: ${err}`);
});