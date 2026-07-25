import React, { useState } from "react";
import { View, Text, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone as string,
      token: otp,
      type: "sms",
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    }
    // Note: On success, AuthProvider will detect the session change and automatically redirect.
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-12">
          <Text className="text-4xl font-bold text-neutral-900 mb-2">Verify OTP</Text>
          <Text className="text-lg text-neutral-500">
            We sent a code to {phone}
          </Text>
        </View>

        <Input
          label="6-digit Code"
          placeholder="123456"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Button 
          className="mt-6" 
          onPress={handleVerifyOtp} 
          loading={loading}
        >
          Verify & Sign In
        </Button>
        
        <Button 
          className="mt-4" 
          variant="ghost"
          onPress={() => router.back()} 
          disabled={loading}
        >
          Change Phone Number
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
