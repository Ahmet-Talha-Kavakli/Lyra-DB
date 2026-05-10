import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSignUp } from '@clerk/expo/legacy';
import { useRouter } from 'expo-router';

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!isLoaded || !signUp) return;
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim().toLowerCase(),
        password: pass,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (e: any) {
      const clerkErr = e?.errors?.[0];
      setErr(clerkErr?.longMessage || clerkErr?.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !signUp || !setActive) return;
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        const missing = (result as any).missingFields?.join(', ') || result.status;
        setErr(`Missing required fields: ${missing}`);
      }
    } catch (e: any) {
      const clerkErr = e?.errors?.[0];
      const errCode = clerkErr?.code;
      if (errCode === 'verification_expired') {
        setErr('Code expired. Please request a new one.');
      } else if (errCode === 'form_code_incorrect') {
        setErr('Incorrect code. Please check and try again.');
      } else {
        setErr(clerkErr?.longMessage || clerkErr?.message || 'Verification failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!isLoaded || !signUp?.id) {
      setErr('Session expired. Please go back and try again.');
      return;
    }
    setBusy(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode('');
      setErr('');
      setInfo('New code sent!');
    } catch (e: any) {
      const clerkErr = e?.errors?.[0];
      setErr(clerkErr?.longMessage || clerkErr?.message || 'Could not resend. Go back and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'verify') {
    const canVerify = code.trim().length === 6 && !busy;
    return (
      <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={st.header}>
            <Text style={st.title}>Check Email</Text>
            <Text style={st.sub}>We sent a code to</Text>
            <Text style={st.emailHint}>{email}</Text>
          </View>

          <Text style={st.label}>Verification Code</Text>
          <TextInput
            style={[st.input, st.codeInput]}
            value={code}
            onChangeText={(t) => { setCode(t.replace(/\D/g, '')); setErr(''); setInfo(''); }}
            placeholder="000000"
            placeholderTextColor="#6B5E8A"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={handleVerify}
            autoFocus
          />

          {err ? <Text style={st.err}>{err}</Text> : null}
          {info ? <Text style={st.infoTxt}>{info}</Text> : null}

          <Pressable style={[st.btn, !canVerify && st.dim]} onPress={handleVerify} disabled={!canVerify}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Verify Email</Text>}
          </Pressable>

          <Pressable onPress={resend} style={st.link} disabled={busy}>
            <Text style={st.linkTxt}>Resend code</Text>
          </Pressable>

          <Pressable onPress={() => { setStep('form'); setErr(''); setInfo(''); setCode(''); }} style={st.link}>
            <Text style={[st.linkTxt, { color: '#6B5E8A' }]}>← Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const canSubmit = isLoaded &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    pass.length >= 8 &&
    !busy;

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Text style={st.title}>Join Lyra</Text>
          <Text style={st.sub}>Start your wellness journey</Text>
        </View>

        <Text style={st.label}>First Name</Text>
        <TextInput
          style={st.input}
          value={firstName}
          onChangeText={(t) => { setFirstName(t); setErr(''); }}
          placeholder="First name"
          placeholderTextColor="#6B5E8A"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={st.label}>Last Name</Text>
        <TextInput
          ref={lastNameRef}
          style={st.input}
          value={lastName}
          onChangeText={(t) => { setLastName(t); setErr(''); }}
          placeholder="Last name"
          placeholderTextColor="#6B5E8A"
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="familyName"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={st.label}>Email</Text>
        <TextInput
          ref={emailRef}
          style={st.input}
          value={email}
          onChangeText={(t) => { setEmail(t); setErr(''); }}
          placeholder="you@example.com"
          placeholderTextColor="#6B5E8A"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={st.label}>Password</Text>
        <TextInput
          ref={passRef}
          style={st.input}
          value={pass}
          onChangeText={(t) => { setPass(t); setErr(''); }}
          placeholder="Min 8 characters"
          placeholderTextColor="#6B5E8A"
          secureTextEntry
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleCreate}
        />

        {err ? <Text style={st.err}>{err}</Text> : null}

        <Pressable style={[st.btn, !canSubmit && st.dim]} onPress={handleCreate} disabled={!canSubmit}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Create Account</Text>}
        </Pressable>

        <View style={st.row}>
          <Text style={st.gray}>Have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={st.linkTxt}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0A1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 42, fontWeight: '900', color: '#9A7DE4', letterSpacing: -1 },
  sub: { fontSize: 15, color: '#A89EC8', marginTop: 6 },
  emailHint: { fontSize: 14, color: '#9A7DE4', fontWeight: '600', marginTop: 4 },
  label: { color: '#A89EC8', fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: '#1A1030', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#F5F3FF', borderWidth: 1.5, borderColor: '#2D1A5E' },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  err: { color: '#FF6B6B', textAlign: 'center', marginTop: 14, fontSize: 13, lineHeight: 18 },
  infoTxt: { color: '#6BE4A0', textAlign: 'center', marginTop: 14, fontSize: 13 },
  btn: { backgroundColor: '#6237C9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  dim: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  link: { alignItems: 'center', marginTop: 18, paddingVertical: 4 },
  linkTxt: { color: '#9A7DE4', fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  gray: { color: '#6B5E8A', fontSize: 14 },
});
