import type { CapacitorConfig } from '@capacitor/cli'
import type { NimiRemoteAppConfig } from '@nimiplatform/kit/core/app-session'
import { resolveDevelopmentRealm } from '@nimiplatform/app-tools/development'
const realm = resolveDevelopmentRealm()
if (realm.name !== 'local') throw new Error('Open Notebook Android requires the explicitly selected local Realm.')
export const mobileAccess: Omit<NimiRemoteAppConfig, 'fetch'> = {
  appId: 'io.github.nimiplatform.open-notebook', clientId: 'io.github.nimiplatform.open-notebook.android.dev',
  realmEnvironmentId: realm.environmentId, realmBaseUrl: realm.apiOrigin, officialWebBaseUrl: realm.webOrigin,
  redirectUri: 'ai.nimi.apps.opennotebook.dev:/oauth/callback',
}
const config: CapacitorConfig = {
  appId: 'ai.nimi.apps.opennotebook.dev', appName: 'Open Notebook', webDir: 'dist-mobile', loggingBehavior: 'none',
  server: { androidScheme: 'https' }, android: { useLegacyBridge: false, minWebViewVersion: 120 },
  plugins: { NimiAppAccess: { realmBaseUrl: mobileAccess.realmBaseUrl, clientId: mobileAccess.clientId, redirectUri: mobileAccess.redirectUri } },
}
export default config
