/**
 * AgriScan AI — Top App Header
 *
 * Clean, minimal header with soft shadow and green accent.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, typography, radius } from './theme';
import Icon from './icons';
import { getCurrentUser } from './auth';

const AppHeader = ({
  title = 'AgriScan AI',
  subtitle = '',
  showBack = false,
  onBack = () => {},
  actions = [],
}) => {
  const hasSafeTop = Platform.OS === 'ios';
  const user = getCurrentUser();

  return (
    <View
      style={[
        styles.header,
        hasSafeTop && { paddingTop: 44 },
      ]}>
      <View style={styles.headerInner}>
        {/* LEFT */}
        <View style={styles.left}>
   {showBack ? (
             <TouchableOpacity
               accessibilityLabel="Quay lại"
               style={[
                   styles.backBtn,
                   Platform.OS === 'web'
                     ? {
                         cursor: 'pointer',
                         WebkitUserSelect: 'none',
                         userSelect: 'none',
                       }
                     : {},
                 ]}
               onPress={onBack}>
               <Icon name="arrow_back_ios_new" size={18} color={colors['on-surface']} />
             </TouchableOpacity>
           ) : (
             <View style={styles.logoBadge}>
               <Icon name="eco" size={17} color={colors.primary} />
             </View>
           )}

          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

         {/* RIGHT */}
         <View style={styles.right}>
           {actions.map((a, i) => (
             <TouchableOpacity
               key={a.label || i}
               accessibilityLabel={a.label}
               style={[
                   styles.actionBtn,
                   Platform.OS === 'web'
                     ? {
                         cursor: 'pointer',
                         WebkitUserSelect: 'none',
                         userSelect: 'none',
                       }
                     : {},
                 ]}
               onPress={a.onPress}>
               <Icon name={a.icon} size={a.size || 18} color={a.color || colors['on-surface-variant']} />
             </TouchableOpacity>
           ))}

          {user?.avatar && !user.avatar.includes('favicon.ico') ? (
            <Image source={{ uri: user.avatar }} style={styles.profile} />
          ) : (
            <View style={styles.profileFallback}>
              <Text style={styles.profileInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'B'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderColor: colors['outline'],
    shadowColor: '#141414',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    zIndex: 20,
  },
  headerInner: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  title: {
    color: colors['on-surface'],
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors['surface-container-low'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors['outline'],
  },
  profile: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  profileFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors['primary-fixed'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});

export default AppHeader;
