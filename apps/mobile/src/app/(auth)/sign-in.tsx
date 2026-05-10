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
import { useSignIn } from '@clerk/expo/legacy';
import { useRouter } from 'expo-router';

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const passRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!isLoaded || !signIn || !setActive) return;
    if (!email.trim() || !pass) return;

    setErr('');
    setBusy(true);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password: pass,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setErr('Sign in incomplete. Please try again.');
      }
    } catch (e: any) {
      const clerkErr = e?.errors?.[0];
      setErr(clerkErr?.longMessage || clerkErr?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = isLoaded && email.trim().length > 0 && pass.length > 0 && !busy;

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={st.header}>
          <Text style={st.title}>Lyra</Text>
          <Text style={st.sub}>Your AI therapy companion</Text>
        </View>

        <Text style={st.label}>Email</Text>
        <TextInput
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
          placeholder="Your password"
          placeholderTextColor="#6B5E8A"
          secureTextEntry
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {err ? <Text style={st.err}>{err}</Text> : null}

        <Pressable
          style={[st.btn, !canSubmit && st.dim]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnTxt}>Sign In</Text>}
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={st.link}>
          <Text style={st.linkTxt}>Forgot password?</Text>
        </Pressable>

        <View style={st.row}>
          <Text style={st.gray}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={st.linkTxt}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0A1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 44 },
  title: { fontSize: 48, fontWeight: '900', color: '#9A7DE4', letterSpacing: -1 },
  sub: { fontSize: 15, color: '#A89EC8', marginTop: 6 },
  label: { color: '#A89EC8', fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: '#1A1030', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#F5F3FF', borderWidth: 1.5, borderColor: '#2D1A5E' },
  err: { color: '#FF6B6B', textAlign: 'center', marginTop: 14, fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: '#6237C9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  dim: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  link: { alignItems: 'center', marginTop: 18, paddingVertical: 4 },
  linkTxt: { color: '#9A7DE4', fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  gray: { color: '#6B5E8A', fontSize: 14 },
});
