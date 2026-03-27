import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Database, Globe, Trash2, Eye, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Privacy Policy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t('Last updated')}: February 2026</Text>

        <View style={styles.highlightCard}>
          <Shield size={20} color="#FF2D55" />
          <Text style={styles.highlightText}>
            Your privacy matters. We are committed to protecting your personal data and being transparent about how we use it.
          </Text>
        </View>

        <View style={styles.quickLinksRow}>
          <TouchableOpacity style={styles.quickLink}>
            <Database size={16} color="#3B82F6" />
            <Text style={styles.quickLinkText}>Data We Collect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink}>
            <Eye size={16} color="#8B5CF6" />
            <Text style={styles.quickLinkText}>Your Rights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink}>
            <Lock size={16} color="#22C55E" />
            <Text style={styles.quickLinkText}>Security</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>1. {t('Information We Collect')}</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Personal Information:</Text> When you create an account, we collect your phone number, name, date of birth, gender, photos, bio, interests, and location.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Usage Data:</Text> We collect information about how you use the app, including matches, likes, messages, and profile views.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Device Information:</Text> We may collect device type, operating system, unique device identifiers, and mobile network information.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Payment Information:</Text> Payment transactions are processed by ArifPay. We store transaction references but never your payment card details.
        </Text>

        <Text style={styles.sectionTitle}>2. {t('How We Use Your Information')}</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Provide and improve our dating service</Text>
          <Text style={styles.bulletItem}>• Match you with compatible users</Text>
          <Text style={styles.bulletItem}>• Enable communication between users</Text>
          <Text style={styles.bulletItem}>• Personalize your experience</Text>
          <Text style={styles.bulletItem}>• Ensure safety and prevent fraud</Text>
          <Text style={styles.bulletItem}>• Send you notifications and updates</Text>
          <Text style={styles.bulletItem}>• Comply with legal obligations</Text>
          <Text style={styles.bulletItem}>• Process payments and manage subscriptions</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Legal Basis for Processing (GDPR)</Text>
        <Text style={styles.paragraph}>
          We process your personal data based on the following legal grounds:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Consent:</Text> You provide explicit consent when creating your account and agreeing to our terms.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Contract:</Text> Processing is necessary to fulfill our service agreement with you.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Legitimate Interest:</Text> We process data for fraud prevention, security, and service improvement.</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Legal Obligation:</Text> We may process data to comply with applicable laws.</Text>
        </View>

        <Text style={styles.sectionTitle}>4. {t('Information Sharing')}</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>With Other Users:</Text> Your profile information, photos, and activity are visible to other users based on your privacy settings.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Service Providers:</Text> We share data with third-party service providers who help us operate the app (hosting, analytics, payment processing via ArifPay).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Legal Requirements:</Text> We may disclose information when required by law or to protect our rights and users&apos; safety.
        </Text>
        <View style={styles.importantCard}>
          <Text style={styles.importantText}>We do NOT sell your personal information to third parties.</Text>
        </View>

        <Text style={styles.sectionTitle}>5. {t('Data Security')}</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Encrypted data transmission (SSL/TLS)</Text>
          <Text style={styles.bulletItem}>• Secure database storage with Supabase</Text>
          <Text style={styles.bulletItem}>• Row Level Security (RLS) for data isolation</Text>
          <Text style={styles.bulletItem}>• Regular security audits</Text>
          <Text style={styles.bulletItem}>• Access controls and authentication</Text>
          <Text style={styles.bulletItem}>• Biometric authentication support</Text>
        </View>
        <Text style={styles.paragraph}>
          No method of transmission over the internet is 100% secure. You are responsible for keeping your account credentials confidential.
        </Text>

        <Text style={styles.sectionTitle}>6. {t('Data Retention')}</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal information within 30 days, except where we need to retain it for legal obligations (up to 90 days for payment records).
        </Text>

        <Text style={styles.sectionTitle}>7. Your Privacy Rights (GDPR & Global)</Text>
        <View style={styles.rightsCard}>
          <View style={styles.rightItem}>
            <Eye size={16} color="#3B82F6" />
            <View style={styles.rightContent}>
              <Text style={styles.rightTitle}>Right to Access</Text>
              <Text style={styles.rightDesc}>Request a copy of your personal data</Text>
            </View>
          </View>
          <View style={styles.rightItem}>
            <Database size={16} color="#8B5CF6" />
            <View style={styles.rightContent}>
              <Text style={styles.rightTitle}>Right to Rectification</Text>
              <Text style={styles.rightDesc}>Correct inaccurate personal data</Text>
            </View>
          </View>
          <View style={styles.rightItem}>
            <Trash2 size={16} color="#EF4444" />
            <View style={styles.rightContent}>
              <Text style={styles.rightTitle}>Right to Erasure</Text>
              <Text style={styles.rightDesc}>Request deletion of your data</Text>
            </View>
          </View>
          <View style={styles.rightItem}>
            <Lock size={16} color="#F59E0B" />
            <View style={styles.rightContent}>
              <Text style={styles.rightTitle}>Right to Restriction</Text>
              <Text style={styles.rightDesc}>Limit how we process your data</Text>
            </View>
          </View>
          <View style={styles.rightItem}>
            <Globe size={16} color="#22C55E" />
            <View style={styles.rightContent}>
              <Text style={styles.rightTitle}>Right to Data Portability</Text>
              <Text style={styles.rightDesc}>Export your data in a portable format</Text>
            </View>
          </View>
        </View>
        <Text style={styles.paragraph}>
          To exercise these rights, visit your Account Settings or contact us at privacy@datingapp.com. We will respond within 30 days.
        </Text>

        <Text style={styles.sectionTitle}>8. {t('Cookies & Tracking')}</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar technologies to improve your experience, analyze usage patterns, and personalize content. On our website, we use:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Essential Cookies:</Text> Required for basic functionality (always active)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Analytics Cookies:</Text> Help us understand app usage (opt-out available)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Preference Cookies:</Text> Remember your settings and preferences</Text>
        </View>
        <Text style={styles.paragraph}>
          You can manage cookie preferences in your device settings or browser settings. Disabling cookies may affect certain features.
        </Text>

        <Text style={styles.sectionTitle}>9. {t('Location Data')}</Text>
        <Text style={styles.paragraph}>
          We collect your location to show you nearby matches. You can control location permissions in your device settings. Premium users can hide their precise location while still seeing matches. We never share your exact location with other users — only approximate distance is shown.
        </Text>

        <Text style={styles.sectionTitle}>10. {t('Children\'s Privacy')}</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for users under 18. We do not knowingly collect information from minors. If we discover that we have collected data from someone under 18, we will delete it immediately.
        </Text>

        <Text style={styles.sectionTitle}>11. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your data may be transferred to and processed in countries other than your own. We use Supabase (hosted in secure data centers) for data storage. We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) where applicable, to protect your data in accordance with GDPR requirements.
        </Text>

        <Text style={styles.sectionTitle}>12. Data Handling Documentation</Text>
        <Text style={styles.paragraph}>
          We maintain detailed records of all data processing activities as required by GDPR Article 30. Our data handling practices include:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Data minimization — we only collect what is necessary</Text>
          <Text style={styles.bulletItem}>• Purpose limitation — data is used only for stated purposes</Text>
          <Text style={styles.bulletItem}>• Storage limitation — data is deleted when no longer needed</Text>
          <Text style={styles.bulletItem}>• Regular data protection impact assessments (DPIAs)</Text>
          <Text style={styles.bulletItem}>• Staff training on data protection</Text>
          <Text style={styles.bulletItem}>• Incident response procedures for data breaches</Text>
        </View>

        <Text style={styles.sectionTitle}>13. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use the following third-party services:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Supabase:</Text> Database and authentication</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>ArifPay:</Text> Payment processing</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Expo:</Text> App framework and push notifications</Text>
        </View>
        <Text style={styles.paragraph}>
          Each third-party service has its own privacy policy governing their use of your data.
        </Text>

        <Text style={styles.sectionTitle}>14. Changes to Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email. Your continued use after changes constitutes acceptance. Material changes will require renewed consent where applicable under GDPR.
        </Text>

        <Text style={styles.sectionTitle}>15. {t('Contact Us')}</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactLine}>Data Protection Officer</Text>
          <Text style={styles.contactDetail}>Email: privacy@datingapp.com</Text>
          <Text style={styles.contactDetail}>Phone: +251 944 120 739</Text>
          <Text style={styles.contactDetail}>Support: support@datingapp.com</Text>
          <Text style={styles.contactNote}>We aim to respond within 48 hours (30 days max for GDPR requests).</Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  highlightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F7',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  quickLink: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quickLinkText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700' as const,
    color: '#1A1A1A',
  },
  bulletList: {
    marginBottom: 12,
    gap: 6,
  },
  bulletItem: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    paddingLeft: 4,
  },
  importantCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
  },
  importantText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#059669',
    textAlign: 'center',
  },
  rightsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rightContent: {
    flex: 1,
  },
  rightTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  rightDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  contactLine: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
});
