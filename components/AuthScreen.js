import React, { useState, useEffect } from "react";
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
} from "react-native";
import { signIn, signUp } from "../lib/auth";

const { width } = Dimensions.get("window");
const isDesktop = width >= 1024;
const isTablet = width >= 768;
const MIN_PASSWORD_LENGTH = 6;

const AuthScreen = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalIsError, setModalIsError] = useState(true);

  const showError = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalIsError(true);
    setModalVisible(true);
  };

  const showSuccess = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalIsError(false);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleAuth = async () => {
    if (!email || !password) {
      showError("Chyba", "Vyplňte prosím všechna pole");
      return;
    }
    if (!isLogin && password.length < MIN_PASSWORD_LENGTH) {
      showError("Chyba", `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků.`);
      return;
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      const { user, error } = result;

      if (error) {
        let errorMessage = typeof error === "string" ? error : error?.message || String(error);
        if (isLogin && String(errorMessage).includes("Invalid login credentials")) {
          errorMessage =
            "Nesprávný e-mail nebo heslo.\n\nPokud ještě nemáte účet, přejděte do režimu registrace.";
        }
        showError("Chyba", errorMessage);
        return;
      }

      if (user) {
        if (!isLogin) showSuccess("Úspěch", "Účet byl úspěšně vytvořen!");
        onAuthSuccess?.(user);
      } else {
        showError("Chyba", "Operaci se nepodařilo dokončit");
      }
    } catch (error) {
      showError("Chyba", error?.message || "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2070&q=80",
      }}
      style={styles.background}
      blurRadius={4}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.centered}>
            <View style={styles.topBar}>
              <Image
                source={require("../assets/logo.jpg")}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Cinevia</Text>
            </View>

            <Text style={styles.headline}>Pohodlné místo pro milovníky filmů</Text>

            <View style={styles.formBlock}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="#888"
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
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
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
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLogin ? "Přihlásit se" : "Vytvořit účet"}
                  </Text>
                )}
              </TouchableOpacity>

              {isLogin && (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => {
                    setModalTitle("Obnovení hesla");
                    setModalMessage("Funkce bude brzy k dispozici. Obraťte se na podporu.");
                    setModalIsError(false);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.linkAccent}>Zapomněli jste heslo?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => {
                  setIsLogin(!isLogin);
                  setEmail("");
                  setPassword("");
                }}
              >
                <Text style={styles.linkMuted}>
                  {isLogin ? "Nemáte účet? " : "Už máte účet? "}
                </Text>
                <Text style={styles.linkAccent}>{isLogin ? "Vytvořit" : "Přihlásit se"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal}>
          <View onStartShouldSetResponder={() => true}>
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
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
};

const createStyles = () => {
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const formWidth = isDesktop
    ? Math.min(width * 0.4, 420)
    : isTablet
    ? Math.min(width * 0.7, 400)
    : width - 40;

  return StyleSheet.create({
    background: { flex: 1 },
    container: { flex: 1 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.78)",
      paddingHorizontal: isDesktop ? 48 : isTablet ? 32 : 20,
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
      marginBottom: isDesktop ? 32 : isTablet ? 28 : 24,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    logoImage: {
      width: isDesktop ? 56 : isTablet ? 52 : 46,
      height: isDesktop ? 56 : isTablet ? 52 : 46,
      marginRight: 12,
      opacity: 0.85,
    },
    logoText: {
      fontSize: isDesktop ? 28 : isTablet ? 26 : 24,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.5,
    },
    headline: {
      fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
      fontWeight: "700",
      color: "#fff",
      textAlign: "center",
      marginBottom: isDesktop ? 40 : isTablet ? 32 : 28,
      maxWidth: formWidth,
      lineHeight: isDesktop ? 40 : isTablet ? 36 : 32,
    },
    formBlock: { width: "100%", maxWidth: formWidth },
    inputRow: { marginBottom: isDesktop ? 22 : isTablet ? 20 : 18 },
    label: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: "#fff",
      fontWeight: "600",
      marginBottom: isDesktop ? 10 : isTablet ? 8 : 6,
    },
    input: {
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: isDesktop ? 14 : isTablet ? 12 : 10,
      padding: isDesktop ? 18 : isTablet ? 16 : 14,
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
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
      borderRadius: isDesktop ? 14 : isTablet ? 12 : 10,
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: isDesktop ? 28 : isTablet ? 24 : 20,
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    buttonDisabled: { backgroundColor: "#666", opacity: 0.8 },
    primaryButtonText: {
      color: "#fff",
      fontSize: isDesktop ? 18 : isTablet ? 17 : 16,
      fontWeight: "700",
    },
    linkRow: {
      alignItems: "center",
      marginBottom: isDesktop ? 14 : isTablet ? 12 : 10,
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    linkMuted: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: "rgba(255, 255, 255, 0.85)",
    },
    linkAccent: { fontSize: isDesktop ? 15 : isTablet ? 14 : 13, color: "#f97316", fontWeight: "600" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalBox: { width: "100%", maxWidth: 340, borderRadius: 16, padding: 24, alignItems: "center" },
    modalBoxError: { backgroundColor: "#2a1a1a", borderWidth: 1, borderColor: "rgba(229, 9, 20, 0.4)" },
    modalBoxSuccess: { backgroundColor: "#1a2a1a", borderWidth: 1, borderColor: "rgba(34, 197, 94, 0.4)" },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 12, textAlign: "center" },
    modalMessage: { fontSize: 15, color: "rgba(255, 255, 255, 0.9)", textAlign: "center", marginBottom: 20, lineHeight: 22 },
    modalButton: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10, minWidth: 100, alignItems: "center" },
    modalButtonError: { backgroundColor: "#e50914" },
    modalButtonSuccess: { backgroundColor: "#22c55e" },
    modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  });
};

const styles = createStyles();

export default AuthScreen;
