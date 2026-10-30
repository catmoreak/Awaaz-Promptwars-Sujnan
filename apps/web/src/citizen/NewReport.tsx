import { CATEGORIES, CATEGORY_LABELS, LIMITS, SERVICE_AREA, type Category, type CreateReportInput } from '@awaaz/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { ImagePlus, LocateFixed, Mic, Square, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError, api } from '../api';
import { CATEGORY_ICONS } from '../shared/categories';
import { useLanguage, type Language } from '../shared/language';
import { MAPS_KEY, MAP_TYPE, useMapsAvailable } from '../shared/maps';
import { useVoiceRecorder } from './useVoiceRecorder';
import { MAX_RECORDING_MS } from './voice';

const PHOTO_MAX_WIDTH = 1280;

interface LatLng {
  lat: number;
  lng: number;
}

/** Shrinks a photo in the browser, so uploads stay small on a mobile connection. */
async function preparePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

function PinMap({ value, onChange }: { value: LatLng | null; onChange: (value: LatLng) => void }) {
  return (
    <div className="pin-map">
      <APIProvider apiKey={MAPS_KEY as string}>
        <Map
          defaultCenter={{ lat: SERVICE_AREA.lat, lng: SERVICE_AREA.lng }}
          defaultZoom={14}
          mapTypeId={MAP_TYPE}
          center={value ?? undefined}
          gestureHandling="greedy"
          clickableIcons={false}
          disableDefaultUI
          onClick={(event) => {
            if (event.detail.latLng) onChange(event.detail.latLng);
          }}
        >
          {value && <Marker position={value} />}
        </Map>
      </APIProvider>
    </div>
  );
}

export function NewReport({ onSent }: { onSent: (id: string) => void }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const voice = useVoiceRecorder();
  const mapsAvailable = useMapsAvailable();

  const [clientRequestId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [landmark, setLandmark] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [viaVoice, setViaVoice] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<Language>(language);
  const [formError, setFormError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const recordingTimer = useRef<number | null>(null);

  const transcribe = useMutation({
    mutationFn: api.transcribe,
    onSuccess: (result) => {
      setText((current) => (current ? `${current} ${result.transcript}` : result.transcript));
      setViaVoice(true);
    },
    onError: (error) => setVoiceError(error instanceof ApiError ? error.message : t.voiceFailed),
  });

  const stopRecording = async () => {
    if (recordingTimer.current) window.clearTimeout(recordingTimer.current);
    const clip = await voice.stop();
    if (clip) transcribe.mutate({ ...clip, language: voiceLanguage });
  };

  const stopRef = useRef(stopRecording);
  stopRef.current = stopRecording;

  const startRecording = async () => {
    setVoiceError(null);
    if (!(await voice.start())) {
      setVoiceError(t.micDenied);
      return;
    }
    recordingTimer.current = window.setTimeout(() => void stopRef.current(), MAX_RECORDING_MS);
  };

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await preparePhoto(file));
    } catch {
      // Some phone formats, such as HEIC, cannot be opened by every browser.
      setPhotoError(t.photoFailed);
    }
  };

  const place = (next: LatLng) => {
    setPoint(next);
    setLatInput(next.lat.toFixed(5));
    setLngInput(next.lng.toFixed(5));
  };

  const useMyLocation = () => {
    setLocationError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        place({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError(t.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const commitTyped = (lat: string, lng: string) => {
    const [parsedLat, parsedLng] = [Number(lat), Number(lng)];
    if (lat && lng && Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) setPoint({ lat: parsedLat, lng: parsedLng });
  };

  const submit = useMutation({
    mutationFn: (input: CreateReportInput) => api.createReport(input),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      onSent(report.id);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : t.retry),
  });

  const send = () => {
    setFormError(null);
    if (text.trim().length < LIMITS.textMin && !photo) return setFormError(t.textRequired);
    if (!point && landmark.trim().length < 3) return setFormError(t.locationRequired);

    submit.mutate({
      clientRequestId,
      text: text.trim(),
      category: category ?? 'OTHER',
      lat: point?.lat,
      lng: point?.lng,
      address: landmark.trim() || undefined,
      viaVoice,
      image: photo ? { base64: photo.split(',')[1] ?? '', mime: 'image/jpeg' } : undefined,
    });
  };

  return (
    <div className="citizen-stack">
      <section className="form-block">
        <h2>{t.whatHappened}</h2>
        <textarea aria-label={t.whatHappened} rows={4} maxLength={LIMITS.textMax} value={text} onChange={(event) => setText(event.target.value)} />
        {config.data?.voiceEnabled && (
          <div className="voice-row">
            <div className="segmented" role="radiogroup" aria-label={t.speak}>
              {(['kn', 'en'] as const).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={voiceLanguage === option} disabled={voice.recording} onClick={() => setVoiceLanguage(option)}>
                  {option === 'kn' ? 'ಕನ್ನಡ' : 'English'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button"
              disabled={transcribe.isPending}
              onClick={() => void (voice.recording ? stopRecording() : startRecording())}
            >
              {voice.recording ? <Square size={16} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
              {transcribe.isPending ? t.transcribing : voice.recording ? t.stop : t.speak}
            </button>
          </div>
        )}
        {voiceError && <p className="form-error">{voiceError}</p>}
      </section>

      <section className="form-block">
        <h2>{t.type}</h2>
        <div className="tiles" role="radiogroup" aria-label={t.type}>
          {CATEGORIES.map((item) => {
            const Icon = CATEGORY_ICONS[item];
            return (
              <button key={item} type="button" role="radio" aria-checked={category === item} className="tile" onClick={() => setCategory(item)}>
                <Icon size={22} aria-hidden="true" />
                {CATEGORY_LABELS[item][language]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="form-block">
        <h2>{t.where}</h2>
        {mapsAvailable && <PinMap value={point} onChange={place} />}
        <button type="button" className="button" disabled={locating} onClick={useMyLocation}>
          <LocateFixed size={18} aria-hidden="true" />
          {locating ? t.locating : t.useMyLocation}
        </button>
        {locationError && <p className="form-error">{locationError}</p>}
        {!mapsAvailable && (
          <div className="coordinate-row">
            <input
              aria-label={t.latitude}
              placeholder={t.latitude}
              inputMode="decimal"
              value={latInput}
              onChange={(event) => {
                setLatInput(event.target.value);
                commitTyped(event.target.value, lngInput);
              }}
            />
            <input
              aria-label={t.longitude}
              placeholder={t.longitude}
              inputMode="decimal"
              value={lngInput}
              onChange={(event) => {
                setLngInput(event.target.value);
                commitTyped(latInput, event.target.value);
              }}
            />
          </div>
        )}
        <input aria-label={t.landmark} placeholder={t.landmark} maxLength={300} value={landmark} onChange={(event) => setLandmark(event.target.value)} />
      </section>

      <section className="form-block">
        <h2>{t.photo}</h2>
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="" />
            <button type="button" className="icon-button" onClick={() => setPhoto(null)} aria-label={t.removePhoto}>
              <X size={18} />
            </button>
          </div>
        ) : (
          <label className="button photo-input">
            <ImagePlus size={18} aria-hidden="true" />
            {t.choosePhoto}
            <input type="file" accept="image/*" onChange={(event) => void choosePhoto(event)} />
          </label>
        )}
        {photoError && <p className="form-error">{photoError}</p>}
      </section>

      {formError && <p className="form-error">{formError}</p>}
      <button className="button button-primary button-large" disabled={submit.isPending} onClick={send}>
        {submit.isPending ? t.sending : t.send}
      </button>
    </div>
  );
}
