import { Tabs } from "expo-router";
import { LayoutDashboard, Building, FileText, Briefcase, User } from "lucide-react-native";
import { Platform } from "react-native";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#3654F4", // Primary Indigo for Admin
        tabBarInactiveTintColor: "#A3A3A3",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5E5",
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === "ios" ? 88 : 68,
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="society"
        options={{
          title: "Society",
          tabBarIcon: ({ color, size }) => <Building color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="content"
        options={{
          title: "Content",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: "Operations",
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
