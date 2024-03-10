import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { moderateScale } from "react-native-size-matters";
import Ionicons from "react-native-vector-icons/Ionicons";

import { colors } from "../data/colors";

export const PlayReadingButton = ({
  isPlaying,
  playSound,
  stopSound,
  isLoading,
  size = 50,
}) => {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center" }}>
      <TouchableOpacity
        onPress={() => {
          if (!isPlaying) {
            playSound();
          } else {
            stopSound();
          }
        }}
      >
        {isLoading ? (
          <View
            style={{
              width: size,
              height: size,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator
              color={colors.white}
              size={moderateScale(size - 15, 0.2)}
            />
          </View>
        ) : (
          <>
            {!isPlaying ? (
              <View
                style={[
                  styles.center,
                  {
                    width: moderateScale(size, 0.2),
                    height: moderateScale(size, 0.2),
                    backgroundColor: colors.bgSecondary,
                    borderRadius: 50,
                  },
                ]}
              >
                <Ionicons
                  name="play"
                  size={moderateScale(size - 30, 0.2)}
                  color={colors.text}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.center,
                  {
                    width: moderateScale(size, 0.2),
                    height: moderateScale(size, 0.2),
                    backgroundColor: colors.bgSecondary,
                    borderRadius: 50,
                  },
                ]}
              >
                <Ionicons
                  name="stop"
                  size={moderateScale(size - 30, 0.2)}
                  color={colors.text}
                />
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});
