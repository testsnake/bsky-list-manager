import { ListEntry } from "../types";
import { BaseProfileModel, userTestParam } from "./baseProfileModel";
import { checkUserAvatar } from "./defaultAvatarModel/checkUser";


export class defaultAvatarModel extends BaseProfileModel {

    constructor(list: string) {
        super(list);
    }

    async testProfile(param: userTestParam): Promise<boolean> {
        if (!param.listManager) {
            throw new Error("List manager is not initialized");
        }

        const results = await checkUserAvatar({ agent: param.listManager.getAgent(), user: param.user, did: param.did });

        if (results.result === 1 || results.result === 0) {
            return true;
        }
        return false;
    }
}