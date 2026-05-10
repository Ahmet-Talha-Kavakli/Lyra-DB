import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';

export default function ForgotPassword() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!isLoaded || !signIn) return;
    setErr(''); setBusy(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setStep(2);
    } catch (e: any) {
      setErr(e?.errors?.[0]?.longMessage || 'Failed');
    } finally { setBusy(false); }
  }

  async function verify() {
    if (!isLoaded || !signIn) return;
    setErr(''); setBusy(true);
    try {
      const r = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code });
      if (r.status === 'needs_new_password') setStep(3);
    } catch (e: any) {
      setErr(e?.errors?.[0]?.longMessage || 'Wrong code');
    } finally { setBusy(false); }
  }

  async function reset() {
    if (!isLoaded || !signIn) return;
    if (pw !== pw2) { setErr('Passwords don\'t match'); return; }
    if (pw.length < 8) { setErr('Min 8 characters'); return; }
    setErr(''); setBusy(true);
    try {
      const r = await signIn.resetPassword({ password: pw });
      if (r.status === 'complete' && r.createdSessionId) await setActive!({ session: r.createdSessionId });
    } catch (e: any) {
      setErr(e?.errors?.[0]?.longMessage || 'Failed');
    } finally { setBusy(false); }
  }

  const heading = step === 1 ? 'Reset Password' : step === 2 ? 'Enter Code' : 'New Password';
  const subtext = step === 1 ? 'We\'ll email you a code' : step === 2 ? `Sent to ${email}` : 'Choose a strong password';

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <Text style={st.title}>{heading}</Text>
        <Text style={st.sub}>{subtext}</Text>

        {step === 1 && <>
          <Text style={st.label}>Email</Text>
          <TextInput style={st.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#6B5E8A" autoCapitalize="none" keyboardType="email-address" returnKeyType="go" onSubmitEditing={sendCode} />
          {err ? <Text style={st.err}>{err}</Text> : null}
          <Pressable style={[st.btn, (!email.trim() || busy) && st.dim]} onPress={sendCode} disabled={!email.trim() || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Send Code</Text>}
          </Pressable>
        </>}

        {step === 2 && <>
          <Text style={st.label}>Code</Text>
          <TextInput style={st.input} value={code} onChangeText={setCode} placeholder="123456" placeholderTextColor="#6B5E8A" keyboardType="number-pad" returnKeyType="go" onSubmitEditing={verify} />
          {err ? <Text style={st.err}>{err}</Text> : null}
          <Pressable style={[st.btn, (code.length < 6 || busy) && st.dim]} onPress={verify} disabled={code.length < 6 || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Verify</Text>}
          </Pressable>
          <Pressable onPress={sendCode} style={st.link}><Text style={st.linkTxt}>Resend</Text></Pressable>
        </>}

        {step === 3 && <>
          <Text style={st.label}>New Password</Text>
          <TextInput style={st.input} value={pw} onChangeText={setPw} placeholder="Min 8 chars" placeholderTextColor="#6B5E8A" secureTextEntry />
          <Text style={[st.label, { marginTop: 12 }]}>Confirm</Text>
          <TextInput style={st.input} value={pw2} onChangeText={setPw2} placeholder="Again" placeholderTextColor="#6B5E8A" secureTextEntry returnKeyType="go" onSubmitEditing={reset} />
          {err ? <Text style={st.err}>{err}</Text> : null}
          <Pressable style={[st.btn, (!pw || !pw2 || busy) && st.dim]} onPress={reset} disabled={!pw || !pw2 || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Reset Password</Text>}
          </Pressable>
        </>}

        <Pressable onPress={() => router.back()} style={st.link}><Text style={st.linkTxt}>Back to Sign In</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0A1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: '900', color: '#9A7DE4', textAlign: 'center' },
  sub: { fontSize: 15, color: '#A89EC8', textAlign: 'center', marginBottom: 32 },
  label: { color: '#A89EC8', fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#1E1432', borderRadius: 12, padding: 14, fontSize: 16, color: '#F5F3FF', borderWidth: 1, borderColor: '#3B217944' },
  err: { color: '#E87C7C', textAlign: 'center', marginTop: 12, fontSize: 13 },
  btn: { backgroundColor: '#6237C9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  dim: { opacity: 0.45 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 16 },
  linkTxt: { color: '#9A7DE4', fontWeight: '600', fontSize: 14 },
});
