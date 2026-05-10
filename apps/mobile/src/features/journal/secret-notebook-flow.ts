import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

/**
 * Gizli (private) defter şifre akışı.
 *
 * Mimari (Mini Faz B):
 *  - PIN: 4-6 haneli sayısal şifre, expo-secure-store'da Keychain/Keystore'da saklanır.
 *  - Face ID / Touch ID: kayıtlı PIN varsa biyometric önce denenir, başarısız olursa PIN sorulur.
 *  - Lockout: 5 yanlış denemeden sonra 1 dakika bekleme süresi.
 *  - Kurtarma YOK: PIN unutulursa içerik kaybolur (kullanıcıya çok net uyarı yapılır).
 *
 * Storage anahtarları:
 *   secret_pin           : PIN değeri (string, "1234" gibi)
 *   secret_attempts       : Yanlış deneme sayısı (string number)
 *   secret_lockout_until  : Lockout bitiş timestamp'i (string ISO)
 *
 * NOT: İçerik şifrelemesi (AES-GCM, PBKDF2) Faz C'de gelecek.
 *      Şu an PIN sadece "kapı bekçisi" — defteri açmaya yeter, içerik henüz şifrelenmiyor.
 */

const KEY_PIN = 'lyra_secret_pin';
const KEY_ATTEMPTS = 'lyra_secret_attempts';
const KEY_LOCKOUT_UNTIL = 'lyra_secret_lockout_until';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 dakika

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function getStoredPin(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_PIN);
}

async function setStoredPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PIN, pin);
}

async function clearStoredPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PIN);
  await SecureStore.deleteItemAsync(KEY_ATTEMPTS);
  await SecureStore.deleteItemAsync(KEY_LOCKOUT_UNTIL);
}

async function getAttempts(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEY_ATTEMPTS);
  return v ? parseInt(v, 10) : 0;
}

async function setAttempts(n: number): Promise<void> {
  await SecureStore.setItemAsync(KEY_ATTEMPTS, String(n));
}

async function getLockoutUntil(): Promise<number | null> {
  const v = await SecureStore.getItemAsync(KEY_LOCKOUT_UNTIL);
  return v ? parseInt(v, 10) : null;
}

async function setLockoutUntil(ts: number): Promise<void> {
  await SecureStore.setItemAsync(KEY_LOCKOUT_UNTIL, String(ts));
}

async function clearLockout(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_LOCKOUT_UNTIL);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function isSecretPinSet(): Promise<boolean> {
  const pin = await getStoredPin();
  return pin !== null && pin.length > 0;
}

export interface SecretNotebookCallbacks {
  onUnlock: () => void;
  onCancel?: () => void;
}

/**
 * Ana giriş noktası — kullanıcı gizli defteri açmaya çalıştığında çağrılır.
 *  - PIN yoksa → kurma akışı başlar
 *  - PIN varsa → açma akışı (Face ID dener, yoksa PIN sorar)
 */
export async function openSecretNotebook(callbacks: SecretNotebookCallbacks) {
  const hasPin = await isSecretPinSet();
  if (!hasPin) {
    return setupSecretPin(callbacks);
  }
  return unlockSecretNotebook(callbacks);
}

// ─── Setup akışı (ilk kez PIN kurma) ─────────────────────────────────────────

function setupSecretPin({ onUnlock, onCancel }: SecretNotebookCallbacks) {
  // Adım 1: KRİTİK uyarı
  Alert.alert(
    'Çok Önemli — Lütfen Oku',
    '⚠️ Gizli defterine bir PIN belirleyeceksin. Bu PIN sadece sende kalacak — Lyra bile göremez.\n\n' +
    'PIN\'ini KAYBEDERSEN, gizli defterindeki tüm yazılar GERİ GELMEZ. ' +
    'Sıfırlama, kurtarma veya yardım yöntemi yoktur.\n\n' +
    'Hazır mısın?',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Hazırım, devam et',
        style: 'default',
        onPress: () => promptNewPin(onUnlock, onCancel),
      },
    ],
  );
}

function promptNewPin(onUnlock: () => void, onCancel?: () => void) {
  Alert.prompt(
    'PIN Belirle',
    '4-6 haneli bir PIN seç (sadece rakam).',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Devam',
        onPress: (rawPin?: string) => {
          const pin = (rawPin ?? '').trim();
          if (!/^\d{4,6}$/.test(pin)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              'Geçersiz PIN',
              '❌ PIN 4 ile 6 hane arası sadece rakamlardan oluşmalı.',
              [{ text: 'Tekrar dene', onPress: () => promptNewPin(onUnlock, onCancel) }],
            );
            return;
          }
          // Adım 2: doğrulama (PIN'i 2. kez sor)
          confirmNewPin(pin, onUnlock, onCancel);
        },
      },
    ],
    'secure-text',
    '',
    'number-pad',
  );
}

function confirmNewPin(originalPin: string, onUnlock: () => void, onCancel?: () => void) {
  Alert.prompt(
    'PIN\'i Tekrarla',
    'PIN\'ini bir kez daha gir (doğrulama için).',
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Onayla',
        onPress: async (confirm?: string) => {
          if ((confirm ?? '').trim() !== originalPin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              'PIN\'ler eşleşmiyor',
              '❌ Girdiğin iki PIN aynı değil. Tekrar deneyelim.',
              [{ text: 'Baştan dene', onPress: () => promptNewPin(onUnlock, onCancel) }],
            );
            return;
          }
          // PIN'i sakla
          await setStoredPin(originalPin);
          await setAttempts(0);
          await clearLockout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Kullanıcıya başarı bildir
          Alert.alert(
            'PIN belirlendi',
            '✅ Gizli defterin artık korunuyor. PIN\'ini güvenli bir yerde hatırla — kayboldu mu, içerik geri gelmez.',
            [{ text: 'Tamam', onPress: () => onUnlock() }],
          );
        },
      },
    ],
    'secure-text',
    '',
    'number-pad',
  );
}

// ─── Açma akışı (mevcut PIN ile) ─────────────────────────────────────────────

async function unlockSecretNotebook({ onUnlock, onCancel }: SecretNotebookCallbacks) {
  // Lockout kontrol
  const lockoutUntil = await getLockoutUntil();
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Çok fazla yanlış deneme',
      `⏰ Güvenlik için biraz beklemen gerek. ${remainingSec} saniye sonra tekrar dene.`,
      [{ text: 'Tamam', onPress: () => onCancel?.() }],
    );
    return;
  }
  if (lockoutUntil && Date.now() >= lockoutUntil) {
    // Lockout süresi geçti, sıfırla
    await clearLockout();
    await setAttempts(0);
  }

  // Önce Face ID / Touch ID dene (cihazda destek varsa ve enrolled ise)
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Gizli defterini aç',
      cancelLabel: 'PIN ile aç',
      disableDeviceFallback: true, // Cihaz parolasına düşme; bizim PIN'imiz var
    });
    if (result.success) {
      await setAttempts(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
      return;
    }
    // Biyometric başarısız ya da kullanıcı "PIN ile aç" dedi → PIN'e düş
  }

  // PIN ile aç
  promptUnlockPin(onUnlock, onCancel);
}

async function promptUnlockPin(onUnlock: () => void, onCancel?: () => void) {
  const attempts = await getAttempts();
  const remainingTries = MAX_ATTEMPTS - attempts;
  const message = remainingTries < MAX_ATTEMPTS
    ? `🔐 PIN'ini gir. (Kalan deneme: ${remainingTries})`
    : '🔐 Gizli defterini açmak için PIN\'ini gir.';

  Alert.prompt(
    'Gizli Defter',
    message,
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Aç',
        onPress: (rawPin?: string) => {
          handlePinAttempt((rawPin ?? '').trim(), onUnlock, onCancel);
        },
      },
    ],
    'secure-text',
    '',
    'number-pad',
  );
}

async function handlePinAttempt(
  enteredPin: string,
  onUnlock: () => void,
  onCancel?: () => void,
) {
  const storedPin = await getStoredPin();
  if (storedPin && enteredPin === storedPin) {
    // Başarılı — sayaçları sıfırla ve aç
    await setAttempts(0);
    await clearLockout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUnlock();
    return;
  }

  // Yanlış PIN
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  const newAttempts = (await getAttempts()) + 1;
  await setAttempts(newAttempts);

  if (newAttempts >= MAX_ATTEMPTS) {
    // Lockout başlat
    const until = Date.now() + LOCKOUT_DURATION_MS;
    await setLockoutUntil(until);
    Alert.alert(
      '5 yanlış deneme',
      `⏰ Güvenlik için ${LOCKOUT_DURATION_MS / 1000} saniye boyunca PIN giremezsin. Sonra tekrar dene.`,
      [{ text: 'Tamam', onPress: () => onCancel?.() }],
    );
    return;
  }

  const remaining = MAX_ATTEMPTS - newAttempts;
  Alert.alert(
    'Yanlış PIN',
    `❌ PIN doğru değil. ${remaining} denemen kaldı.`,
    [
      {
        text: 'Vazgeç',
        style: 'cancel',
        onPress: () => onCancel?.(),
      },
      {
        text: 'Tekrar dene',
        onPress: () => promptUnlockPin(onUnlock, onCancel),
      },
    ],
  );
}

// ─── Test / debug yardımcıları ───────────────────────────────────────────────
// (Sadece geliştirme amaçlı — production'da gizli kalsın.)

export async function _debugClearSecretPin(): Promise<void> {
  await clearStoredPin();
}
