import { readEnv } from "./env";

/** What runs: `X.Y.Z+sha`, set by the image build (`APP_VERSION`); a local run says so. */
export const appVersion = (): string => readEnv().APP_VERSION ?? "0.0.0+local";
