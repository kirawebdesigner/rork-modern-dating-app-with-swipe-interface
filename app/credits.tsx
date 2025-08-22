import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useMembership } from '@/hooks/membership-context';
import { Plus, ArrowLeft, MessageCircle, Zap, Unlock, Crown } from 'lucide-react-native';

export default function Credits() {
  const router = useRouter();
  const { credits, addCredits, tier } = useMembership();

  const buyPack = async (type: 'messages' | 'boosts' | 'unlocks', amount: number, price: string) => {
    Alert.alert(
      'Purchase Credits',
      `Buy ${amount} ${type} for ${price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Buy', 
          onPress: async () => {
            await addCredits(type, amount);
            Alert.alert('Success', `Added ${amount} ${type} to your account!`);
          }
        }
      ]
    );
  };

  const creditPacks = [
    {
      type: 'messages' as const,
      icon: MessageCircle,
      title: 'Message Credits',
      description: 'Send messages to your matches',
      packs: [
        { amount: 10, price: '$2.99' },
        { amount: 25, price: '$5.99' },
        { amount: 50, price: '$9.99' },
      ]
    },
    {
      type: 'boosts' as const,
      icon: Zap,
      title: 'Profile Boosts',
      description: 'Get more visibility and matches',
      packs: [
        { amount: 1, price: '$3.99' },
        { amount: 3, price: '$9.99' },
        { amount: 5, price: '$14.99' },
      ]
    },
    {
      type: 'unlocks' as const,
      icon: Unlock,
      title: 'Profile Unlocks',
      description: 'See who liked your profile',
      packs: [
        { amount: 5, price: '$1.99' },
        { amount: 15, price: '$4.99' },
        { amount: 30, price: '$7.99' },
      ]
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Credits Store</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.currentCreditsSection}>
          <Text style={styles.sectionTitle}>Your Credits</Text>
          <View style={styles.creditsGrid}>
            <View style={styles.creditCard}>
              <MessageCircle size={24} color={Colors.primary} />
              <Text style={styles.creditValue}>{credits.messages}</Text>
              <Text style={styles.creditLabel}>Messages</Text>
            </View>
            <View style={styles.creditCard}>
              <Zap size={24} color={Colors.primary} />
              <Text style={styles.creditValue}>{credits.boosts}</Text>
              <Text style={styles.creditLabel}>Boosts</Text>
            </View>
            <View style={styles.creditCard}>
              <Unlock size={24} color={Colors.primary} />
              <Text style={styles.creditValue}>{credits.unlocks}</Text>
              <Text style={styles.creditLabel}>Unlocks</Text>
            </View>
          </View>
        </View>

        {tier === 'free' && (
          <TouchableOpacity 
            style={styles.premiumBanner}
            onPress={() => router.push('/premium' as any)}
          >
            <Crown size={20} color={Colors.text.white} />
            <Text style={styles.premiumText}>Upgrade to Premium for unlimited credits!</Text>
          </TouchableOpacity>
        )}

        {creditPacks.map((category) => {
          const IconComponent = category.icon;
          return (
            <View key={category.type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <IconComponent size={20} color={Colors.primary} />
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{category.title}</Text>
                  <Text style={styles.sectionDescription}>{category.description}</Text>
                </View>
              </View>
              
              <View style={styles.packsGrid}>
                {category.packs.map((pack, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.packCard}
                    onPress={() => buyPack(category.type, pack.amount, pack.price)}
                  >
                    <Text style={styles.packAmount}>+{pack.amount}</Text>
                    <Text style={styles.packPrice}>{pack.price}</Text>
                    <View style={styles.packButton}>
                      <Plus size={16} color={Colors.text.white} />
                      <Text style={styles.packButtonText}>Buy</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Credits Work</Text>
          <View style={styles.infoItem}>
            <MessageCircle size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>Message credits let you send messages to matches</Text>
          </View>
          <View style={styles.infoItem}>
            <Zap size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>Boosts make your profile more visible for 30 minutes</Text>
          </View>
          <View style={styles.infoItem}>
            <Unlock size={16} color={Colors.text.secondary} />
            <Text style={styles.infoText}>Unlocks reveal who has liked your profile</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentCreditsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  creditsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  creditCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creditValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 8,
  },
  creditLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  premiumText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  packsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  packCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  packAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  packButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  packButtonText: {
    color: Colors.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    flex: 1,
  },
  bottomSpacing: {
    height: 100,
  },
});