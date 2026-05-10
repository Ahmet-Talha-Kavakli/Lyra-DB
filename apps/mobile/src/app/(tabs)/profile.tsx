import { View, ScrollView, Pressable, Alert, StyleSheet, Text as RNText } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Row {
  icon: IconName;
  label: string;
}

interface Section {
  title: string;
  rows: Row[];
}

const SECTIONS: Section[] = [
  {
    title: 'Account',
    rows: [
      { icon: 'person-outline', label: 'Edit Profile' },
      { icon: 'notifications-outline', label: 'Notifications' },
      { icon: 'shield-outline', label: 'Privacy & Security' },
    ],
  },
  {
    title: 'Therapy',
    rows: [
      { icon: 'heart-outline', label: 'Therapy Preferences' },
      { icon: 'analytics-outline', label: 'Progress & Insights' },
      { icon: 'download-outline', label: 'Export Data' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'help-circle-outline', label: 'Help & FAQ' },
      { icon: 'document-text-outline', label: 'Terms & Privacy' },
      { icon: 'chatbox-outline', label: 'Contact Us' },
    ],
  },
];

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}` || 'U';
  const fullName = user?.fullName ?? 'User';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={st.avatarSection}>
          <View style={st.avatarCircle}>
            <RNText style={st.avatarInitials}>{initials}</RNText>
          </View>
          <RNText style={st.name}>{fullName}</RNText>
          <RNText style={st.email}>{email}</RNText>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={st.section}>
            <RNText style={st.sectionTitle}>{section.title.toUpperCase()}</RNText>
            <View style={st.sectionCard}>
              {section.rows.map((row, i) => (
                <View key={row.label}>
                  <Pressable
                    style={({ pressed }) => [st.row, pressed && st.rowPressed]}
                  >
                    <View style={st.rowLeft}>
                      <View style={st.iconBox}>
                        <Ionicons name={row.icon} size={18} color={colors.brand[300]} />
                      </View>
                      <RNText style={st.rowLabel}>{row.label}</RNText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                  </Pressable>
                  {i < section.rows.length - 1 && <View style={st.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [st.signOutBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.accent.alert} />
          <RNText style={st.signOutTxt}>Sign Out</RNText>
        </Pressable>

        <RNText style={st.version}>Lyra v0.1.0</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brand[950] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 28 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2.5,
    borderColor: colors.brand[400],
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.3 },
  email: { fontSize: 13, color: colors.text.muted, marginTop: 4 },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface.secondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(98,55,201,0.18)',
    overflow: 'hidden',
  },

  // Row — key fix: flexDirection row, alignItems center, justifyContent space-between ALL in one line
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: 'rgba(98,55,201,0.1)' },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(98,55,201,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { fontSize: 15, color: colors.text.primary },
  divider: {
    height: 1,
    backgroundColor: 'rgba(98,55,201,0.12)',
    marginLeft: 60,
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,124,124,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,124,124,0.18)',
  },
  signOutTxt: { fontSize: 15, color: colors.accent.alert, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, color: colors.text.muted },
});
