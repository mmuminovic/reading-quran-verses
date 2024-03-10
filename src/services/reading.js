import axios from "axios";

export const getAyahTranslation = ({ surah, ayah, translation }) =>
  new Promise(async (resolve, reject) => {
    try {
      const data = await axios.get(
        `https://quranenc.com/api/translation/aya/${translation}/${surah}/${ayah}`,
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });

export const getSegments = (chapter, ayah, reciterId) =>
  new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(
        `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapter}&segments=true`,
      );
      const data = res.data.audio_files[0].verse_timings;

      const selectedTiming = data.find(
        (item) => item.verse_key === `${chapter}:${ayah}`,
      );

      resolve(selectedTiming);
    } catch (error) {
      reject(error);
    }
  });
