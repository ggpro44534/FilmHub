import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;
const MENU_WIDTH = isDesktop ? 300 : isTablet ? 280 : 260;

const MenuBar = ({ 
  currentScreen, 
  onNavigate, 
  user, 
  onLogout,
  isOpen,
  onClose,
}) => {
  const menuItems = [
    { id: 'main', label: 'Filmy', icon: '🎬' },
    { id: 'profile', label: 'Profil', icon: '👤' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : []),
    { id: 'logout', label: 'Odhlásit se', icon: '🚪' },
  ];

  const handlePress = (itemId) => {
    if (itemId === 'logout') {
      onLogout();
    } else {
      onNavigate(itemId);
    }
    onClose();
  };

  const menuContent = (
    <View style={styles.menuContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>KINO PLATFORMA</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.menuList}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              currentScreen === item.id && styles.menuItemActive,
            ]}
            onPress={() => handlePress(item.id)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.menuText,
                currentScreen === item.id && styles.menuTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web' && width >= 768) {
    return (
      <View style={styles.menuContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>KINO PLATFORMA</Text>
        </View>
        
        <ScrollView style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                currentScreen === item.id && styles.menuItemActive,
              ]}
              onPress={() => handlePress(item.id)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.menuText,
                  currentScreen === item.id && styles.menuTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuWrapper}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {menuContent}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuWrapper: {
    flexDirection: 'row',
    height: '100%',
  },
  menuContainer: {
    width: MENU_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: '#333',
    paddingTop: Platform.OS === 'web' ? 60 : 20,
    height: '100%',
  },
  logoContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    fontWeight: 'bold',
    color: '#e50914',
    letterSpacing: 1,
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && { display: 'none' }),
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isDesktop ? 18 : isTablet ? 16 : 15,
    paddingHorizontal: isDesktop ? 25 : isTablet ? 22 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuItemActive: {
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 3,
    borderLeftColor: '#e50914',
  },
  menuIcon: {
    fontSize: isDesktop ? 22 : isTablet ? 21 : 20,
    marginRight: isDesktop ? 18 : isTablet ? 16 : 15,
    width: isDesktop ? 35 : isTablet ? 32 : 30,
  },
  menuText: {
    fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
    color: '#fff',
    flex: 1,
  },
  menuTextActive: {
    color: '#e50914',
    fontWeight: 'bold',
  },
});

export default MenuBar;
