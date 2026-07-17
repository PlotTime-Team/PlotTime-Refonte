import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AuthRequest, ResponseType, exchangeCodeAsync, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Aide SSO côté NATIF (builds App Store / Play Store, dev builds EAS) :
// obtient un jeton du fournisseur via expo-auth-session (Google, Discord) ou
// expo-apple-authentication (Apple), à envoyer au serveur (/api/auth/oauth).
// Le web garde son propre chemin (lib/sso.ts, SDK officiels) — ne rien casser.
//
// ⚠️ Tout est CONFIG-GATED : les client IDs viennent de GET /api/auth/providers
// (GOOGLE_IOS_CLIENT_ID / GOOGLE_ANDROID_CLIENT_ID / DISCORD_CLIENT_ID /
// APPLE_BUNDLE_ID côté serveur). Sans config, aucun bouton natif ne s'affiche.

export function ssoNativeAvailable(): boolean {
  // Builds réels uniquement (dev build EAS, TestFlight, stores). Dans Expo Go
  // (`storeClient`), le scheme `serietime://` n'est pas enregistré et un jeton
  // Apple porterait le bundle id d'Expo Go (audience rejetée par le serveur) :
  // on garde alors le formulaire e-mail de secours.
  return (
    Platform.OS !== 'web' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

// À appeler au montage de l'écran d'auth : referme la fenêtre du navigateur
// au retour du flux OAuth (indispensable sur Android, no-op ailleurs).
export function completeAuthSession(): void {
  try {
    WebBrowser.maybeCompleteAuthSession();
  } catch {
    /* export web statique : pas de window */
  }
}

// ---------------------------------------------------------------------------
// Discord — code + PKCE (client public : AUCUN secret embarqué dans l'app).
// Redirect natif `serietime://oauth/discord` (scheme du app.json) : à déclarer
// dans le portail développeur Discord (OAuth2 → Redirects) avant usage.
// ---------------------------------------------------------------------------

const DISCORD_DISCOVERY = {
  authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
};

// Résout en un access token Discord, ou `null` si l'utilisateur annule.
export async function nativeDiscordLogin(clientId: string): Promise<string | null> {
  const redirectUri = makeRedirectUri({ scheme: 'serietime', path: 'oauth/discord' });
  const request = new AuthRequest({
    clientId,
    scopes: ['identify', 'email'],
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
  });
  const result = await request.promptAsync(DISCORD_DISCOVERY);
  if (result.type !== 'success' || !result.params.code) return null;
  const token = await exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      // Échange PKCE sans secret : le code_verifier prouve que c'est bien nous.
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
    },
    DISCORD_DISCOVERY,
  );
  return token.accessToken ?? null;
}

// ---------------------------------------------------------------------------
// Sign in with Apple — iOS uniquement (module natif chargé dynamiquement pour
// ne jamais casser le bundle web ni Android, cf. expo-image-picker).
// ---------------------------------------------------------------------------

export type AppleLoginResult = { identityToken: string; displayName: string | null };

export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const Apple = await import('expo-apple-authentication');
    return await Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

// Résout en { identityToken, displayName } ou `null` si l'utilisateur annule.
// Le nom complet n'est fourni par Apple qu'AU PREMIER login : le serveur ne
// l'utilise qu'à la création du compte (champ displayName de /api/auth/oauth).
export async function nativeAppleLogin(): Promise<AppleLoginResult | null> {
  const Apple = await import('expo-apple-authentication');
  try {
    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) return null;
    const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return { identityToken: credential.identityToken, displayName: displayName || null };
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
