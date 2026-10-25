// Deployment facts shared by the build/serve scripts (zero dependencies).
// BASE_PATH must equal `basePath` in next.config.ts (scripts/site-config.test.ts checks it, and
// verify-out fails the build if an emitted asset URL does not start with it).
export const BASE_PATH = '/collections/drive-spots'
