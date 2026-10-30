import { CATEGORIES, CATEGORY_LABELS, SERVICE_AREA, type Category, type StaffReportInput } from '@awaaz/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../api';

const CHANNELS: { id: StaffReportInput['channel']; label: string }[] = [
  { id: 'PHONE', label: 'Phone call' },
  { id: 'WALK_IN', label: 'Walk-in' },
  { id: 'MESSAGE', label: 'Message' },
  { id: 'SOCIAL', label: 'Social media' },
];

/** Staff record reports that reach the office outside the app, so they join the same queue. */
export function AddReport({ onAdded }: { onAdded: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<Category>('OTHER');
  const [channel, setChannel] = useState<StaffReportInput['channel']>('PHONE');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(String(SERVICE_AREA.lat));
  const [lng, setLng] = useState(String(SERVICE_AREA.lng));

  const add = useMutation({
    mutationFn: () => api.addReport({ text, category, channel, address, lat: Number(lat), lng: Number(lng) }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onAdded();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate();
  };

  return (
    <form className="add-report" onSubmit={submit}>
      <h1>Add a report</h1>

      <label>
        Report
        <textarea rows={5} required minLength={5} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} />
      </label>

      <div className="form-row">
        <label>
          How it arrived
          <select value={channel} onChange={(event) => setChannel(event.target.value as StaffReportInput['channel'])}>
            {CHANNELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item].en}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Address or landmark
        <input value={address} maxLength={300} onChange={(event) => setAddress(event.target.value)} />
      </label>

      <div className="form-row">
        <label>
          Latitude
          <input required inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} />
        </label>
        <label>
          Longitude
          <input required inputMode="decimal" value={lng} onChange={(event) => setLng(event.target.value)} />
        </label>
      </div>

      {add.isError && <p className="form-error">{add.error.message}</p>}
      <button className="button button-primary" disabled={add.isPending}>
        {add.isPending ? 'Adding' : 'Add report'}
      </button>
    </form>
  );
}
