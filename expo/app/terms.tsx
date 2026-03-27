import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, CreditCard, Shield, AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useI18n } from '@/hooks/i18n-context';

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Terms & Conditions')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>{t('Last updated')}: February 2026</Text>

        <View style={styles.highlightCard}>
          <FileText size={20} color="#3B82F6" />
          <Text style={styles.highlightText}>
            Please read these terms carefully before using our service. By using the app, you agree to these terms.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>1. {t('Acceptance of Terms')}</Text>
        <Text style={styles.paragraph}>
          By accessing or using our dating application (&quot;Zewijuna&quot;), you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these terms, you must not use our service.
        </Text>

        <Text style={styles.sectionTitle}>2. {t('Age Requirement')}</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years old to use this service. By creating an account, you confirm that you meet this age requirement. We reserve the right to verify your age and terminate accounts that violate this policy.
        </Text>

        <Text style={styles.sectionTitle}>3. {t('Account Registration')}</Text>
        <Text style={styles.paragraph}>
          You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. {t('User Conduct')}</Text>
        <Text style={styles.paragraph}>
          You agree not to:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Harass, abuse, or harm other users</Text>
          <Text style={styles.bulletItem}>• Post false, misleading, or fraudulent content</Text>
          <Text style={styles.bulletItem}>• Use the service for illegal activities</Text>
          <Text style={styles.bulletItem}>• Share explicit or inappropriate content</Text>
          <Text style={styles.bulletItem}>• Impersonate others or create fake profiles</Text>
          <Text style={styles.bulletItem}>• Violate intellectual property rights</Text>
          <Text style={styles.bulletItem}>• Use automated tools or bots</Text>
          <Text style={styles.bulletItem}>• Attempt to circumvent subscription limits</Text>
        </View>

        <Text style={styles.sectionTitle}>5. {t('Content Ownership')}</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post, but grant us a non-exclusive, worldwide, royalty-free license to use, modify, and display this content as needed to operate the service. We reserve the right to remove any content that violates our policies.
        </Text>

        <Text style={styles.sectionTitle}>6. {t('Privacy & Data')}</Text>
        <Text style={styles.paragraph}>
          Your use of the service is also governed by our Privacy Policy. We collect and process your data as described in our Privacy Policy to provide and improve our services. We comply with applicable data protection laws including GDPR where applicable.
        </Text>

        <Text style={styles.sectionTitle}>7. {t('Subscription & Payments')}</Text>
        <View style={styles.paymentCard}>
          <CreditCard size={18} color="#F59E0B" />
          <View style={styles.paymentContent}>
            <Text style={styles.paymentTitle}>Subscription Plans</Text>
            <Text style={styles.paymentDesc}>Silver, Gold, and VIP plans are available with monthly, 6-month, and annual billing.</Text>
          </View>
        </View>
        <Text style={styles.paragraph}>
          Premium features require a paid subscription. Key payment terms:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Payments are processed securely via ArifPay</Text>
          <Text style={styles.bulletItem}>• 6-month plans include a 25% discount</Text>
          <Text style={styles.bulletItem}>• Annual plans include a 40% limited discount</Text>
          <Text style={styles.bulletItem}>• Subscriptions can be cancelled anytime from Settings or the Premium page</Text>
          <Text style={styles.bulletItem}>• Upon cancellation, you retain access until the current billing period ends, then revert to Free</Text>
          <Text style={styles.bulletItem}>• We reserve the right to modify pricing with 30 days advance notice</Text>
        </View>

        <Text style={styles.sectionTitle}>8. Cancellation Policy</Text>
        <Text style={styles.paragraph}>
          You may cancel your subscription at any time through the app (Settings → Premium Plans → Cancel Plan). Upon cancellation:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Your account will be downgraded to the Free tier</Text>
          <Text style={styles.bulletItem}>• You will lose access to premium features immediately</Text>
          <Text style={styles.bulletItem}>• No partial refunds will be issued for unused time</Text>
          <Text style={styles.bulletItem}>• You can re-subscribe at any time</Text>
        </View>

        <Text style={styles.sectionTitle}>9. {t('Refund Policy')}</Text>
        <Text style={styles.paragraph}>
          Refunds for premium subscriptions are handled on a case-by-case basis within 7 days of purchase. After 7 days, no refunds will be issued. To request a refund, contact our support team with your purchase details and transaction ID.
        </Text>

        <Text style={styles.sectionTitle}>10. Referral Program</Text>
        <Text style={styles.paragraph}>
          Our referral program rewards users who invite friends. When you successfully refer 20 users who create accounts, you earn Gold membership for 30 days. Referral rewards:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Cannot be combined with purchased subscriptions</Text>
          <Text style={styles.bulletItem}>• Are non-transferable and have no cash value</Text>
          <Text style={styles.bulletItem}>• May be modified or discontinued at our discretion</Text>
        </View>

        <Text style={styles.sectionTitle}>11. {t('Termination')}</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account at any time for violations of these terms or for any other reason. You may delete your account at any time through the app settings. Upon termination, your data will be handled according to our Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>12. {t('Disclaimers')}</Text>
        <View style={styles.warningCard}>
          <AlertTriangle size={18} color="#F59E0B" />
          <Text style={styles.warningText}>
            The service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee matches, dates, or relationships. We are not responsible for interactions between users. Always exercise caution when meeting people from the app.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>13. {t('Limitation of Liability')}</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
        </Text>

        <Text style={styles.sectionTitle}>14. Governing Law</Text>
        <Text style={styles.paragraph}>
          These terms shall be governed by and construed in accordance with the laws of Ethiopia. Any disputes arising from these terms shall be resolved through good-faith negotiation, and if necessary, through the courts of Ethiopia.
        </Text>

        <Text style={styles.sectionTitle}>15. {t('Changes to Terms')}</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these terms at any time. We will notify users of significant changes through the app or email at least 30 days in advance. Continued use of the service after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>16. {t('Contact Us')}</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactLine}>Legal Department</Text>
          <Text style={styles.contactDetail}>Email: support@datingapp.com</Text>
          <Text style={styles.contactDetail}>Phone: +251 944 120 739</Text>
          <Text style={styles.contactNote}>We respond within 48 hours.</Text>
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
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 22,
    fontWeight: '500' as const,
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
  paymentCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  paymentDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
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
