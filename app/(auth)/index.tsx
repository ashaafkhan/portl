import React, { useState } from "react";
import { View, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [phone, setPhone] = useState("+91");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number with country code.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.push({ pathname: "/(auth)/verify", params: { phone } });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-12">
          <Text className="text-4xl font-bold text-neutral-900 mb-2">Welcome to Portl</Text>
          <Text className="text-lg text-neutral-500">Sign in to your society dashboard</Text>
        </View>

        <Input
          label="Phone Number"
          placeholder="+919999999999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        <Button 
          className="mt-6" 
          onPress={handleSendOtp} 
          loading={loading}
        >
          Send OTP
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
