import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { signIn, signUp } from "../lib/auth";

const MIN_PASSWORD_LENGTH = 6;

const getLayout = () => {
  const { width } = Dimensions.get("window");
  const desktop = width >= 1024;
  const tablet = width >= 768;
  const formWidth = desktop ? Math.min(width * 0.4, 420) : tablet ? Math.min(width * 0.7, 400) : width - 40;
  return { width, desktop, tablet, formWidth };
};

export default function AuthScreen({ onAuthSuccess }) {
  const [layout, setLayout] = useState(getLayout());

  const styles = useMemo(() => createStyles(layout), [layout]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalIsError, setModalIsError] = useState(true);

  useEffect(() => {
    const sub = Dimensions.addEventListener?.("change", () => setLayout(getLayout()));
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const openModal = useCallback((title, message, isError) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalIsError(isError);
    setModalVisible(true);
  }, []);

  const showError = useCallback((title, message) => openModal(title, message, true), [openModal]);
  const showSuccess = useCallback((title, message) => openModal(title, message, false), [openModal]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleAuth = useCallback(async () => {
    const e = (email || "").trim();

    if (!e || !password) {
      showError("Chyba", "Vyplňte prosím všechna pole.");
      return;
    }
    if (!isLogin && password.length < MIN_PASSWORD_LENGTH) {
      showError("Chyba", `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`);
      return;
    }

    setLoading(true);
    try {
      const result = isLogin ? await signIn(e, password) : await signUp(e, password);

      const user = result?.user ?? null;
      const error = result?.error ?? null;

      if (error) {
        let msg = typeof error === "string" ? error : error?.message || String(error);
        if (isLogin && String(msg).includes("Invalid login credentials")) {
          msg = "Nesprávný e-mail nebo heslo.\n\nPokud ještě nemáte účet, přepněte se do režimu registrace.";
        }
        showError("Chyba", msg);
        return;
      }

      if (user) {
        if (!isLogin) showSuccess("Úspěch", "Účet byl úspěšně vytvořen!");
        onAuthSuccess?.(user);
      } else {
        showError("Chyba", "Operaci se nepodařilo dokončit.");
      }
    } catch (err) {
      showError("Chyba", err?.message || "Neznámá chyba.");
    } finally {
      setLoading(false);
    }
  }, [email, password, isLogin, onAuthSuccess, showError, showSuccess]);

  const switchMode = useCallback(() => {
    setIsLogin((v) => !v);
    setEmail("");
    setPassword("");
    setShowPassword(false);
  }, []);

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2070&q=80",
      }}
      style={styles.background}
      blurRadius={4}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.centered}>
            <View style={styles.topBar}>
              <Image source={require("../assets/logo.jpg")} style={styles.logoImage} resizeMode="contain" />
              <Text style={styles.logoText}>Cinevia</Text>
            </View>

            <Text style={styles.headline}>Pohodlné místo pro milovníky filmů</Text>

            <View style={styles.formBlock}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.label}>Heslo</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Zadejte heslo"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword((v) => !v)}
                    activeOpacity={0.85}
                    accessibilityLabel={showPassword ? "Skrýt heslo" : "Zobrazit heslo"}
                  >
                    <View style={styles.eyeIconWrap}>
                      <Text style={styles.eyeIcon}>👁</Text>
                      {showPassword && <View style={styles.eyeSlash} />}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>{isLogin ? "Přihlásit se" : "Vytvořit účet"}</Text>}
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity
                  style={styles.linkRow}
                  activeOpacity={0.85}
                  onPress={() => {
                    openModal("Obnovení hesla", "Funkce bude brzy k dispozici. Obraťte se na podporu.", false);
                  }}
                >
                  <Text style={styles.linkAccent}>Zapomněli jste heslo?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.linkRow} activeOpacity={0.85} onPress={switchMode}>
                <Text style={styles.linkMuted}>{isLogin ? "Nemáte účet? " : "Už máte účet? "}</Text>
                <Text style={styles.linkAccent}>{isLogin ? "Vytvořit" : "Přihlásit se"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={[styles.modalBox, modalIsError ? styles.modalBoxError : styles.modalBoxSuccess]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, modalIsError ? styles.modalButtonError : styles.modalButtonSuccess]}
              onPress={closeModal}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const createStyles = ({ desktop, tablet, formWidth }) =>
  StyleSheet.create({
    background: { flex: 1 },
    container: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.78)",
      paddingHorizontal: desktop ? 48 : tablet ? 32 : 20,
      justifyContent: "center",
      alignItems: "center",
    },
    centered: {
      width: "100%",
      maxWidth: formWidth,
      alignItems: "center",
      justifyContent: "center",
    },
    topBar: {
      width: "100%",
      marginBottom: desktop ? 32 : tablet ? 28 : 24,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    logoImage: {
      width: desktop ? 56 : tablet ? 52 : 46,
      height: desktop ? 56 : tablet ? 52 : 46,
      marginRight: 12,
      opacity: 0.88,
    },
    logoText: {
      fontSize: desktop ? 28 : tablet ? 26 : 24,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.5,
    },
    headline: {
      fontSize: desktop ? 32 : tablet ? 28 : 24,
      fontWeight: "800",
      color: "#fff",
      textAlign: "center",
      marginBottom: desktop ? 40 : tablet ? 32 : 28,
      maxWidth: formWidth,
      lineHeight: desktop ? 40 : tablet ? 36 : 32,
    },
    formBlock: { width: "100%", maxWidth: formWidth },
    inputRow: { marginBottom: desktop ? 22 : tablet ? 20 : 18 },
    label: {
      fontSize: desktop ? 15 : tablet ? 14 : 13,
      color: "rgba(255,255,255,0.92)",
      fontWeight: "700",
      marginBottom: desktop ? 10 : tablet ? 8 : 6,
    },
    input: {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: desktop ? 14 : tablet ? 12 : 10,
      padding: desktop ? 18 : tablet ? 16 : 14,
      fontSize: desktop ? 16 : tablet ? 15 : 14,
      color: "#fff",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    passwordWrap: { position: "relative" },
    passwordInput: { paddingRight: 52 },
    eyeButton: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    eyeIconWrap: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
    eyeIcon: { fontSize: 22, color: "rgba(255, 255, 255, 0.9)" },
    eyeSlash: {
      position: "absolute",
      width: 20,
      height: 1.5,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      transform: [{ rotate: "45deg" }],
    },
    primaryButton: {
      backgroundColor: "#e50914",
      borderRadius: desktop ? 14 : tablet ? 12 : 10,
      padding: desktop ? 20 : tablet ? 18 : 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: desktop ? 28 : tablet ? 24 : 20,
      marginBottom: desktop ? 16 : tablet ? 14 : 12,
    },
    buttonDisabled: { backgroundColor: "rgba(229, 9, 20, 0.45)", opacity: 0.85 },
    primaryButtonText: {
      color: "#fff",
      fontSize: desktop ? 18 : tablet ? 17 : 16,
      fontWeight: "800",
    },
    linkRow: {
      alignItems: "center",
      marginBottom: desktop ? 14 : tablet ? 12 : 10,
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    linkMuted: {
      fontSize: desktop ? 15 : tablet ? 14 : 13,
      color: "rgba(255, 255, 255, 0.82)",
      fontWeight: "600",
    },
    linkAccent: { fontSize: desktop ? 15 : tablet ? 14 : 13, color: "#f97316", fontWeight: "800" },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalBox: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 18,
      padding: 22,
      alignItems: "center",
      borderWidth: 1,
    },
    modalBoxError: { backgroundColor: "rgba(42, 26, 26, 0.95)", borderColor: "rgba(229, 9, 20, 0.45)" },
    modalBoxSuccess: { backgroundColor: "rgba(26, 42, 26, 0.95)", borderColor: "rgba(34, 197, 94, 0.45)" },
    modalTitle: { fontSize: 18, fontWeight: "900", color: "#fff", marginBottom: 12, textAlign: "center" },
    modalMessage: { fontSize: 15, color: "rgba(255, 255, 255, 0.9)", textAlign: "center", marginBottom: 18, lineHeight: 22, fontWeight: "650" },
    modalButton: { paddingVertical: 12, paddingHorizontal: 34, borderRadius: 12, minWidth: 110, alignItems: "center" },
    modalButtonError: { backgroundColor: "#e50914" },
    modalButtonSuccess: { backgroundColor: "#22c55e" },
    modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  });