import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
  Animated,
  Pressable,
  Image,
} from "react-native";

const getMenuWidth = () => {
  const { width } = Dimensions.get("window");
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  return isDesktop ? 320 : isTablet ? 300 : 280;
};

const COLORS = {
  panel: "rgba(10,10,12,0.95)",
  overlay: "rgba(0,0,0,0.62)",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.06)",
  text: "rgba(255,255,255,0.94)",
  textDim: "rgba(255,255,255,0.62)",
  accent: "#E50914",
  accentSoft: "rgba(229,9,20,0.14)",
  itemBg: "rgba(255,255,255,0.03)",
};

export default function MenuBar({
  currentScreen,
  onNavigate,
  user,
  onLogout,
  isOpen,
  onClose,
}) {
  const [menuWidth, setMenuWidth] = useState(getMenuWidth());
  const slideAnim = useRef(new Animated.Value(getMenuWidth())).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const sub = Dimensions.addEventListener?.("change", () => {
      const w = getMenuWidth();
      setMenuWidth(w);
      if (!isOpen) slideAnim.setValue(w);
    });
    return () => sub?.remove?.();
  }, [isOpen, slideAnim]);

  const items = useMemo(
    () => [
      { id: "main", label: "Filmy" },
      { id: "profile", label: "Profil" },
      ...(user?.role === "admin" ? [{ id: "admin", label: "Administrace" }] : []),
      { id: "logout", label: "Odhlásit se" },
    ],
    [user?.role]
  );

  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: menuWidth,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      requestAnimationFrame(() => setModalVisible(false));
    });
  }, [isOpen, fadeAnim, slideAnim, menuWidth]);

  const handlePress = (id) => {
    if (id === "logout") {
      onLogout?.();
      onClose?.();
      return;
    }
    onNavigate?.(id);
    onClose?.();
  };

  const webGlass =
    Platform.OS === "web"
      ? { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }
      : null;

  const isDesktop = Dimensions.get("window").width >= 1024;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.drawer,
            { width: menuWidth, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <Pressable style={[styles.panel, webGlass]} onPress={() => {}}>
            <View style={styles.header}>
              <View style={styles.brand}>
                <Image
                  source={require("../assets/logo.jpg")}
                  style={styles.logo}
                  resizeMode="cover"
                />
                <View>
                  <Text style={[styles.appName, { fontSize: isDesktop ? 20 : 18 }]}>
                    Cinevia
                  </Text>
                  <Text style={styles.sub}>
                    {user?.role === "admin"
                      ? "Režim administrátora"
                      : "Objevuj • Swipe • Ulož"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.75}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.close}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => {
                const active = currentScreen === item.id;
                const logout = item.id === "logout";

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handlePress(item.id)}
                    activeOpacity={0.78}
                    style={[
                      styles.item,
                      active && styles.itemActive,
                      logout && styles.itemLogout,
                    ]}
                  >
                    <View style={[styles.rail, active && styles.railOn]} />
                    <Text
                      style={[
                        styles.itemText,
                        active && styles.itemTextActive,
                        logout && styles.itemTextLogout,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.footerText}>© Cinevia</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  wrapper: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  drawer: {
    height: "100%",
  },
  panel: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingTop: Platform.OS === "web" ? 56 : 46,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 14,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  appName: {
    color: COLORS.text,
    fontWeight: "900",
  },
  sub: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 24,
    fontWeight: "300",
  },
  list: {
    padding: 12,
    paddingTop: 14,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: COLORS.itemBg,
  },
  itemActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: "rgba(229,9,20,0.26)",
  },
  itemLogout: {
    marginTop: 6,
    backgroundColor: "rgba(229,9,20,0.10)",
    borderColor: "rgba(229,9,20,0.22)",
  },
  rail: {
    width: 3,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 10,
  },
  railOn: {
    backgroundColor: COLORS.accent,
  },
  itemText: {
    flex: 1,
    color: "rgba(255,255,255,0.86)",
    fontSize: 15,
    fontWeight: "700",
  },
  itemTextActive: {
    color: "rgba(255,255,255,0.98)",
  },
  itemTextLogout: {
    color: "rgba(255,255,255,0.92)",
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  footerText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
  },
});