import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { CameraBrowserScreen } from '../screens/CameraBrowserScreen';
import { CollageEditorScreen } from '../screens/CollageEditorScreen';

export type RootStackParamList = {
  CameraBrowser: undefined;
  CollageEditor: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="CameraBrowser"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="CameraBrowser" component={CameraBrowserScreen} />
        <Stack.Screen name="CollageEditor" component={CollageEditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
