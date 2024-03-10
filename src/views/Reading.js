import quranMetaData from "@kmaslesa/quran-metadata";
import { Audio } from "expo-av";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { moderateScale } from "react-native-size-matters";
import Ionicons from "react-native-vector-icons/Ionicons";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useMutation } from "react-query";

import { PlayReadingButton } from "../components/PlayReadingButton";
import chapters from "../data/chapters.json";
import { colors } from "../data/colors";
import { getAyahTranslation, getSegments } from "../services/reading";

const reciters = [
  {
    label: "Al Husary",
    value: "http://www.everyayah.com/data/Husary_128kbps/{{audioName}}.mp3",
    reciterId: "6",
  },
  {
    label: "Al Minshawy - Murattal",
    value:
      "http://www.everyayah.com/data/Minshawy_Murattal_128kbps/{{audioName}}.mp3",
    reciterId: "9",
  },
  {
    label: "Al Afasy",
    value: "http://www.everyayah.com/data/Alafasy_128kbps/{{audioName}}.mp3",
    reciterId: "7",
  },
];

const Reading = ({ selectedAyah, closeDialog }) => {
  const { width, height } = Dimensions.get("window");
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioName, setAudioName] = useState("");
  const [loadedAudioName, setLoadedAudioName] = useState("");
  const [text, setText] = useState([]);
  const [translation, setTranslation] = useState("");
  const [surahName, setSurahName] = useState("");
  const [ayahReference, setAyahReference] = useState(null);
  const [audioPosition, setAudioPosition] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [reciter, setReciter] = useState(reciters[0]);
  // const tabHeight = useBottomTabBarHeight();
  // const headerHeight = useHeaderHeight();
  const [suraEndAyahNumber, setSuraEndAyahNumber] = useState(0);

  // const progress = parseFloat((audioPosition / durationMillis).toFixed(2));
  const translateAyahResponseHandler = (data, timings) => {
    if (data.result) {
      const {
        arabic_text: arabicText,
        translation: ayahTranslation,
        sura: surah,
      } = data.result;

      setTranslation(ayahTranslation);
      const arabicTextWords = arabicText.split(" ").map((t, i) => ({
        text: t,
        start: timings.segments[i][0],
        end: timings.segments[i][1],
      }));
      setText(arabicTextWords);
      // setAyahReference({ surah: +surah, ayah: +ayah });

      const { numberOfAyas } = quranMetaData.getSuraByIndex(surah);
      setSuraEndAyahNumber(numberOfAyas);

      const selectedSurahName =
        chapters.find((c) => c.index.includes(surah)).title || "";
      setSurahName(selectedSurahName);
    }
  };

  const getTimings = useCallback((data) => {
    const firstSegmentLength = data.segments[0][1];
    const segments = data.segments.map((s) => [
      s[1] - firstSegmentLength,
      s[2] - firstSegmentLength,
    ]);
    const timingsData = { ...data, segments };
    return timingsData;
  }, []);

  const quranTranslation = useMemo(() => {
    switch (i18n.language) {
      case "tr":
        return "turkish_rwwad";
      case "bs":
        return "bosnian_korkut";
      case "en":
        return "english_rwwad";
      case "de":
        return "german_bubenheim";
      case "sq":
        return "albanian_nahi";
      default:
        return "bosnian_korkut";
    }
  }, [i18n.language]);

  const { mutateAsync: translateAyah, isLoading: isLoadingTranslation } =
    useMutation((data) =>
      getAyahTranslation({ ...data, translation: quranTranslation })
    );

  const { mutateAsync: getSurahSegments } = useMutation((data) =>
    getSegments(data.surah, data.ayah, data.reciterId)
  );

  const pickAyah = async () => {
    if (isPlaying) {
      await stopSound().catch(() => {
        console.log("sound is not stopped successfully");
      });
    }
    setAudioPosition(0);
    setDurationMillis(1);

    const numOfChapter =
      (ayahReference && Number(ayahReference.surah)) ||
      Math.floor(Math.random() * 114 + 1);

    const numOfVerse =
      (ayahReference && Number(ayahReference.ayah)) ||
      Math.floor(Math.random() * chapters[numOfChapter - 1].count + 1);

    const getNumForAudio = (num) => {
      let numString = "";
      if (num < 10) {
        numString = "00" + num;
      } else if (num < 100) {
        numString = "0" + num;
      } else {
        numString = num.toString();
      }
      return numString;
    };

    setAudioName(
      `${getNumForAudio(numOfChapter)}${getNumForAudio(numOfVerse)}`
    );

    const data = await getSurahSegments({
      surah: numOfChapter,
      ayah: numOfVerse,
      reciterId: reciter.reciterId,
    });
    const translateAyahResponse = await translateAyah({
      surah: numOfChapter,
      ayah: numOfVerse,
    });

    translateAyahResponseHandler(translateAyahResponse, getTimings(data));
  };

  const playSound = async (selectedAudioName) => {
    const audioKey = selectedAudioName || audioName;
    if (audioKey === loadedAudioName) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
      return false;
    }
    setIsLoading(true);
    setLoadedAudioName(audioKey);

    try {
      const data = await Audio.Sound.createAsync({
        uri: reciter.value.replace("{{audioName}}", audioKey),
      });
      await data.sound.setProgressUpdateIntervalAsync(50);
      data.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.durationMillis !== durationMillis) {
          setDurationMillis(status.durationMillis);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setAudioPosition(-1);
          data.sound.stopAsync();
        } else {
          setAudioPosition(status.positionMillis);
          setIsPlaying(status.isPlaying);
        }
      });
      setIsLoading(false);
      setSound(data.sound);
      await data.sound.playAsync();
    } catch (err) {
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSound = async () => {
    await sound.stopAsync();
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    pickAyah();
  }, [reciter, ayahReference]);

  const getNextAyah = () => {
    setAyahReference((prev) => ({ ...prev, ayah: prev.ayah + 1 }));
  };

  const getPreviousAyah = () => {
    setAyahReference((prev) => ({ ...prev, ayah: prev.ayah - 1 }));
  };

  if (isLoadingTranslation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          color={colors.primary}
          size={moderateScale(50, 0.2)}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width,
        height: height - 40,
        backgroundColor: colors.bgPrimary,
        position: "relative",
        zIndex: 1,
      }}
    >
      <View
        style={[
          styles.container,
          {
            height: height - 220,
            justifyContent: "center",
            paddingTop: 50,
          },
        ]}
      >
        <ScrollView
          scrollEnabled
          style={{
            width: "100%",
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (!isPlaying) {
                playSound();
              } else {
                stopSound();
              }
            }}
            style={{
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                minHeight: height - 450,
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Text style={[styles.arabicText, { color: colors.text }]}>
                {text.map((t, i) => {
                  const isWordActive =
                    audioPosition &&
                    audioPosition >= 0 &&
                    t.start <= audioPosition &&
                    audioPosition < t.end;
                  return (
                    <Text
                      style={{
                        color: isWordActive ? colors.primary : colors.text,
                      }}
                      key={`${t.start}-${i}`}
                    >
                      {t.text}{" "}
                    </Text>
                  );
                })}
              </Text>
              <Text style={[styles.translationText, { color: colors.text }]}>
                {translation}
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
      <View
        style={{
          width: "100%",
          backgroundColor: colors.bgPrimary,
          elevation: 11,
          zIndex: 20,
          position: "absolute",
          bottom: 100,
          borderTopWidth: 0.5,
          borderTopColor: colors.text,
        }}
      >
        <DropDownPicker
          open={open}
          value={reciter.value}
          items={reciters}
          setOpen={setOpen}
          setValue={(getValue) => {
            const value = getValue();
            const selectedReciter = reciters.find((x) => x.value === value);
            setReciter(selectedReciter);
            setSound();
            setLoadedAudioName("");
          }}
          style={{
            zIndex: 10,
            borderRadius: 0,
            borderWidth: 0,
            backgroundColor: colors.bgPrimary,
            paddingHorizontal: 20,
          }}
          textStyle={{
            color: colors.text,
            fontSize: moderateScale(16, 0.2),
          }}
          listItemContainerStyle={{
            backgroundColor: colors.bgSecondary,
            paddingHorizontal: 20,
            borderColor: colors.text,
            // borderBottomWidth: 1,
          }}
          ArrowUpIconComponent={() => (
            <Icon
              name="keyboard-arrow-up"
              color={colors.text}
              size={moderateScale(24, 0.2)}
            />
          )}
          ArrowDownIconComponent={() => (
            <Icon
              name="keyboard-arrow-down"
              color={colors.text}
              size={moderateScale(24, 0.2)}
            />
          )}
          TickIconComponent={() => (
            <Icon
              name="check"
              color={colors.text}
              size={moderateScale(20, 0.2)}
            />
          )}
          itemProps={{ activeOpacity: 0.8 }}
        />
      </View>
      <View
        style={{
          width: "100%",
          borderTopWidth: 1,
          borderColor: colors.shadow,
          flexDirection: "row",
          // bottom: Platform.OS === 'ios' ? 200 : 200,
          paddingVertical: 15,
          justifyContent: "space-between",
          paddingHorizontal: 25,
          alignItems: "center",
          zIndex: 22,
          marginBottom: 20,
          position: "absolute",
          bottom: 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: moderateScale(16, 0.2),
            }}
          >
            {surahName}
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: moderateScale(14, 0.2),
            }}
          >
            {ayahReference && `${ayahReference.surah}:${ayahReference.ayah}`}
          </Text>
        </View>
        <PlayReadingButton
          isLoading={isLoading}
          isPlaying={isPlaying}
          playSound={playSound}
          stopSound={stopSound}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
          }}
        >
          <TouchableOpacity
            activeOpacity={ayahReference?.ayah <= 1 ? 1 : 0.5}
            onPress={() => {
              if (ayahReference?.ayah > 1) {
                getPreviousAyah();
              }
            }}
            style={{ marginLeft: 18 }}
            disbaled={ayahReference?.ayah <= 1}
          >
            <Ionicons
              name="chevron-back"
              size={moderateScale(30, 0.2)}
              color={
                ayahReference?.ayah > 1
                  ? colors.text
                  : `${colors.textDisabled}77`
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={ayahReference?.ayah >= suraEndAyahNumber ? 1 : 0.5}
            onPress={() => {
              if (ayahReference?.ayah < suraEndAyahNumber) {
                getNextAyah();
              }
            }}
            style={{ marginLeft: 18 }}
            disbaled={ayahReference?.ayah >= suraEndAyahNumber}
          >
            <Ionicons
              name="chevron-forward"
              size={moderateScale(30, 0.2)}
              color={
                ayahReference?.ayah < suraEndAyahNumber
                  ? colors.text
                  : `${colors.textDisabled}77`
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  center: {
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  arabicText: {
    fontSize: moderateScale(32, 0.2),
    textAlign: "right",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  translationText: {
    fontSize: moderateScale(16, 0.2),
    textAlign: "left",
  },
  button: {
    paddingHorizontal: 25,
    marginHorizontal: 5,
    marginBottom: 5,
    textAlign: "center",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    marginVertical: 20,
  },
});

export default Reading;
