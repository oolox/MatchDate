import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { useAbortController } from '../../hooks/useAbortController';
import {
  DEFAULT_TTS_MODEL_ID,
  formatTtsCostLabel,
  GEMINI_VOICE_BY_GENDER,
  genderHintForGeminiVoice,
  getTtsModel,
  isGeminiTtsVoiceId,
  pickRandomGeminiVoice,
  type VoiceGenderHint,
} from '../../services/fal/models/tts';
import { synthesizeSpeech } from '../../services/fal/ttsService';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import { useAppDispatch } from '../../store/hooks';
import type { AssetDocument } from '../../types/opfsDoc';
import {
  DEFAULT_GEMINI_VOICE_PRESET,
  DEFAULT_VOICE_NAME,
  type VoiceAssetMetadata,
  type VoicePreset,
} from '../../types/savedVoice';
import { loadCharacter, saveCharacter } from '../../services/storage/persistenceService';
import { loadVoice, saveVoice } from '../../services/storage/voiceStorage';
import {
  selectCharacterEditorId,
  setCharacterEditorVoiceAssetId,
} from '../../store/slices/characterSlice';
import { formatFailure } from '../../utils/formatFailure';
import type { RootState } from '../../store';
import { useStore } from 'react-redux';

const DEFAULT_SAY_TEXT = 'Hello — this is how I sound.';

export interface VoiceEditorState {
  voiceAssetId: string | null;
  voiceName: string;
  gender: VoiceGenderHint;
  voiceId: string;
  styleInstructions: string;
  temperature: number;
  sayText: string;
  isBusy: boolean;
  isSaying: boolean;
  isDirty: boolean;
  lastError: string | null;
  costLabel: string;
  canSave: boolean;
  canNew: boolean;
}

export interface StartNewVoiceDesignOptions {
  voiceName?: string;
  /** When set, Save links this voice to the character (`voice.characterId` + `character.voiceAssetId`). */
  characterId?: string | null;
  /** Character identity → voice gender (male/female/neutral) + matching Gemini preset. */
  gender?: VoiceGenderHint;
}

export interface VoiceEditor extends VoiceEditorState {
  setVoiceName: (value: string) => void;
  setGender: (value: VoiceGenderHint) => void;
  setVoiceId: (value: string) => void;
  setStyleInstructions: (value: string) => void;
  setTemperature: (value: number) => void;
  setSayText: (value: string) => void;
  handleNew: () => void;
  /** Reset designer for a new voice (e.g. Character → New Voice). */
  startNewVoiceDesign: (options?: StartNewVoiceDesignOptions) => void;
  handleSave: () => Promise<void>;
  handleSayThis: () => Promise<void>;
  loadVoiceAsset: (id: string) => Promise<void>;
  applyVoiceDocument: (doc: AssetDocument) => void;
}

function presetFromControls(
  voiceId: string,
  styleInstructions: string,
  temperature: number,
): VoicePreset {
  return {
    provider: 'gemini',
    voiceId: voiceId.trim() || DEFAULT_GEMINI_VOICE_PRESET.voiceId,
    ...(styleInstructions.trim() ? { styleInstructions: styleInstructions.trim() } : {}),
    ...(Number.isFinite(temperature) ? { temperature } : {}),
  };
}

function hydrateFromMetadata(meta: VoiceAssetMetadata | undefined): {
  voiceName: string;
  gender: VoiceGenderHint;
  voiceId: string;
  styleInstructions: string;
  temperature: number;
  sayText: string;
} {
  const preset = meta?.preset;
  const voiceId =
    preset?.voiceId?.trim() && isGeminiTtsVoiceId(preset.voiceId.trim())
      ? preset.voiceId.trim()
      : DEFAULT_GEMINI_VOICE_PRESET.voiceId;
  const sayThis = meta?.sayThis?.trim();
  return {
    voiceName: meta?.voiceName?.trim() || DEFAULT_VOICE_NAME,
    gender: genderHintForGeminiVoice(voiceId),
    voiceId,
    styleInstructions: preset?.styleInstructions?.trim() || '',
    temperature:
      typeof preset?.temperature === 'number' && Number.isFinite(preset.temperature)
        ? preset.temperature
        : 1,
    sayText: sayThis || DEFAULT_SAY_TEXT,
  };
}

export function useVoiceEditor(): VoiceEditor {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { notify } = useNotification();
  const { begin } = useAbortController();

  const [voiceAssetId, setVoiceAssetId] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState(DEFAULT_VOICE_NAME);
  const [gender, setGenderState] = useState<VoiceGenderHint>('female');
  const [voiceId, setVoiceIdState] = useState(DEFAULT_GEMINI_VOICE_PRESET.voiceId);
  const [styleInstructions, setStyleInstructions] = useState('');
  const [temperature, setTemperature] = useState(1);
  const [sayText, setSayText] = useState(DEFAULT_SAY_TEXT);
  const [isBusy, setIsBusy] = useState(false);
  const [isSaying, setIsSaying] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Character to bind on next Save (from Character → New Voice). */
  const pendingCharacterIdRef = useRef<string | null>(null);

  const revokePlayback = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePlayback();
    };
  }, [revokePlayback]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const setVoiceNameDirty = useCallback(
    (value: string) => {
      setVoiceName(value);
      markDirty();
    },
    [markDirty],
  );

  const setGender = useCallback(
    (value: VoiceGenderHint) => {
      setGenderState(value);
      setVoiceIdState(GEMINI_VOICE_BY_GENDER[value]);
      markDirty();
    },
    [markDirty],
  );

  const setVoiceId = useCallback(
    (value: string) => {
      const next = value.trim() || DEFAULT_GEMINI_VOICE_PRESET.voiceId;
      setVoiceIdState(next);
      setGenderState(genderHintForGeminiVoice(next));
      markDirty();
    },
    [markDirty],
  );

  const setStyleInstructionsDirty = useCallback(
    (value: string) => {
      setStyleInstructions(value);
      markDirty();
    },
    [markDirty],
  );

  const setTemperatureDirty = useCallback(
    (value: number) => {
      setTemperature(value);
      markDirty();
    },
    [markDirty],
  );

  const setSayTextDirty = useCallback(
    (value: string) => {
      setSayText(value);
      markDirty();
    },
    [markDirty],
  );

  const applyVoiceDocument = useCallback(
    (doc: AssetDocument) => {
      if (doc.subtype !== 'voice') {
        return;
      }
      revokePlayback();
      const hydrated = hydrateFromMetadata(doc.metadata as VoiceAssetMetadata | undefined);
      setVoiceAssetId(doc.id);
      setVoiceName(hydrated.voiceName);
      setGenderState(hydrated.gender);
      setVoiceIdState(hydrated.voiceId);
      setStyleInstructions(hydrated.styleInstructions);
      setTemperature(hydrated.temperature);
      setSayText(hydrated.sayText);
      pendingCharacterIdRef.current = null;
      setIsDirty(false);
      setLastError(null);
    },
    [revokePlayback],
  );

  const loadVoiceAsset = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        return;
      }
      setIsBusy(true);
      setLastError(null);
      try {
        const doc = await loadVoice(trimmed);
        applyVoiceDocument(doc);
      } catch (error) {
        const message = formatFailure('load voice', trimmed, error);
        setLastError(message);
        notify(message);
      } finally {
        setIsBusy(false);
      }
    },
    [applyVoiceDocument, notify],
  );

  const applyNewVoiceDefaults = useCallback(
    (voiceNameValue: string, genderHint?: VoiceGenderHint) => {
      const voice =
        genderHint != null
          ? GEMINI_VOICE_BY_GENDER[genderHint]
          : pickRandomGeminiVoice();
      setVoiceAssetId(null);
      setVoiceName(voiceNameValue);
      setVoiceIdState(voice);
      setGenderState(genderHint ?? genderHintForGeminiVoice(voice));
      setStyleInstructions('');
      setTemperature(1);
      setSayText(DEFAULT_SAY_TEXT);
      setLastError(null);
    },
    [],
  );

  const handleNew = useCallback(() => {
    revokePlayback();
    pendingCharacterIdRef.current = null;
    applyNewVoiceDefaults(DEFAULT_VOICE_NAME);
    setIsDirty(false);
  }, [applyNewVoiceDefaults, revokePlayback]);

  const startNewVoiceDesign = useCallback(
    (options?: StartNewVoiceDesignOptions) => {
      revokePlayback();
      const name = options?.voiceName?.trim() || DEFAULT_VOICE_NAME;
      pendingCharacterIdRef.current = options?.characterId?.trim() || null;
      applyNewVoiceDefaults(name, options?.gender);
      setIsDirty(true);
    },
    [applyNewVoiceDefaults, revokePlayback],
  );

  const handleSave = useCallback(async () => {
    setIsBusy(true);
    setLastError(null);
    try {
      const linkCharacterId = pendingCharacterIdRef.current;
      const saved = await saveVoice({
        id: voiceAssetId ?? undefined,
        voiceName: voiceName.trim() || DEFAULT_VOICE_NAME,
        preset: presetFromControls(voiceId, styleInstructions, temperature),
        sayThis: sayText,
        ...(linkCharacterId ? { characterId: linkCharacterId } : {}),
      });
      setVoiceAssetId(saved.id);
      setVoiceName(saved.name);
      setIsDirty(false);

      if (linkCharacterId) {
        try {
          const character = await loadCharacter(linkCharacterId);
          if (character.voiceAssetId !== saved.id) {
            await saveCharacter(
              { ...character, voiceAssetId: saved.id },
              linkCharacterId,
            );
          }
          const editorCharacterId = selectCharacterEditorId(store.getState());
          if (editorCharacterId === linkCharacterId) {
            dispatch(setCharacterEditorVoiceAssetId(saved.id));
          }
        } catch (linkError) {
          console.info('Saved voice but could not link character', {
            linkCharacterId,
            voiceId: saved.id,
            linkError,
          });
          notify(formatFailure('link voice to character', saved.name, linkError));
        }
        pendingCharacterIdRef.current = null;
      }

      dispatch(bumpLibraryEpoch());
      notify(`Saved ${saved.name}`);
    } catch (error) {
      const message = formatFailure('save voice', voiceName, error);
      setLastError(message);
      notify(message);
    } finally {
      setIsBusy(false);
    }
  }, [
    dispatch,
    notify,
    sayText,
    store,
    styleInstructions,
    temperature,
    voiceAssetId,
    voiceId,
    voiceName,
  ]);

  const handleSayThis = useCallback(async () => {
    const text = sayText.trim();
    if (!text || isSaying) {
      return;
    }
    setIsSaying(true);
    setLastError(null);
    const controller = begin();
    try {
      const result = await synthesizeSpeech({
        text,
        modelId: DEFAULT_TTS_MODEL_ID,
        voice: {
          voiceId,
          styleInstructions,
          temperature,
        },
        signal: controller.signal,
      });
      revokePlayback();
      const objectUrl = URL.createObjectURL(result.blob);
      objectUrlRef.current = objectUrl;
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const message = formatFailure('synthesize speech', undefined, error);
      setLastError(message);
      notify(message);
    } finally {
      setIsSaying(false);
    }
  }, [begin, isSaying, notify, revokePlayback, sayText, styleInstructions, temperature, voiceId]);

  const model = getTtsModel(DEFAULT_TTS_MODEL_ID);
  const costLabel = formatTtsCostLabel(sayText.trim().length, model.cost);

  return {
    voiceAssetId,
    voiceName,
    gender,
    voiceId,
    styleInstructions,
    temperature,
    sayText,
    isBusy,
    isSaying,
    isDirty,
    lastError,
    costLabel,
    canSave: !isBusy && !isSaying && (isDirty || !voiceAssetId) && voiceName.trim().length > 0,
    canNew: !isBusy && !isSaying && (isDirty || voiceAssetId != null),
    setVoiceName: setVoiceNameDirty,
    setGender,
    setVoiceId,
    setStyleInstructions: setStyleInstructionsDirty,
    setTemperature: setTemperatureDirty,
    setSayText: setSayTextDirty,
    handleNew,
    startNewVoiceDesign,
    handleSave,
    handleSayThis,
    loadVoiceAsset,
    applyVoiceDocument,
  };
}
