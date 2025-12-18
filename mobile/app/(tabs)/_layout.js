import { Tabs } from "expo-router"
import { View } from "react-native"
import { Home, Calendar, Settings as SettingsIcon } from "lucide-react-native" // Rename to avoid clash

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#15161a",
          borderTopWidth: 0,
          height: 70,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#d0bcff",
        tabBarInactiveTintColor: "#8e9099",
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          headerShown: true,
          headerTitle: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          // Hide settings tab if we want, or keep it.
          // Design didn't explicitly show tab bar, but implied navigation.
          tabBarIcon: ({ color }) => <SettingsIcon size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}
