'use client'

import { useEffect, useState } from 'react'
import { Camera, ChevronDown, FilePenLine, ScanLine, Syringe } from 'lucide-react'
import type { ApplicationDetails } from '@/lib/health-records/application-details'

type HealthCategory = 'asi' | 'parazit'

interface OptionalApplicationDetailsProps {
  category: HealthCategory
  value?: ApplicationDetails | null
  onChange: (value: ApplicationDetails) => void
  onScan: () => void
}

const INPUT_CLASS =
  'w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

export function OptionalApplicationDetails({
  category,
  value,
  onChange,
  onScan,
}: OptionalApplicationDetailsProps) {
  const [mode, setMode] = useState<'choice' | 'form'>('form')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const details: ApplicationDetails = { currency: 'TRY', ...(value ?? {}) }
  const isVaccine = category === 'asi'

  useEffect(() => {
    if (value && Object.keys(value).some((key) => key !== 'currency')) {
      setMode('form')
    }
  }, [value])

  const update = <K extends keyof ApplicationDetails>(key: K, fieldValue: ApplicationDetails[K]) => {
    onChange({ ...details, [key]: fieldValue })
  }

  if (mode === 'choice') {
    return (
      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sm">
            {isVaccine ? <Syringe className="size-5" /> : <ScanLine className="size-5" />}
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-slate-900">
              {isVaccine ? 'Aşı Bilgi Kaydı' : 'Parazit Uygulama Bilgileri'}
              <span className="ml-1.5 text-[11px] font-semibold text-slate-500">(Opsiyonel)</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Ürün ve uygulama bilgilerini eklerseniz sağlık geçmişiniz daha eksiksiz olur.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onScan}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-3 text-[12px] font-bold text-white shadow-sm transition hover:scale-[1.03]"
          >
            <Camera className="size-4" />
            Fotoğraf / OCR
          </button>
          <button
            type="button"
            onClick={() => setMode('form')}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 text-[12px] font-bold text-indigo-700 transition hover:scale-[1.03] hover:bg-indigo-50"
          >
            <FilePenLine className="size-4" />
            Elle Gir
          </button>
        </div>

        <button
          type="button"
          onClick={() => onChange({ currency: 'TRY' })}
          className="mt-2 min-h-11 w-full text-[12px] font-semibold text-slate-500"
        >
          Şimdi değil
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-extrabold text-slate-900">
            {isVaccine ? 'Aşı Bilgi Kaydı' : 'Parazit Uygulama Bilgileri'}
          </p>
          <p className="text-[11px] text-slate-500">Tüm alanlar opsiyoneldir.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={onScan}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-50 px-3 text-[11px] font-bold text-indigo-700 transition hover:scale-[1.05]"
          >
            <Camera className="size-4" />
            Fotoğraf / OCR
          </button>
          <button
            type="button"
            onClick={() => {
              onChange({ currency: 'TRY' })
              setMode('choice')
            }}
            className="min-h-9 px-2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-700"
          >
            Şimdi değil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={isVaccine ? 'Aşı Markası' : 'Marka'}>
          <input
            value={details.brand ?? ''}
            onChange={(event) => update('brand', event.target.value)}
            placeholder={isVaccine ? 'Örn. Nobivac' : 'Örn. NexGard'}
            className={INPUT_CLASS}
          />
        </Field>

        {!isVaccine && (
          <Field label="Ürün Adı">
            <input
              value={details.product_name ?? ''}
              onChange={(event) => update('product_name', event.target.value)}
              placeholder="Ürün adı"
              className={INPUT_CLASS}
            />
          </Field>
        )}

        <Field label="Seri / Lot No">
          <input
            value={details.lot_number ?? ''}
            onChange={(event) => update('lot_number', event.target.value)}
            placeholder="Ambalaj üzerindeki numara"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Ürün SKT">
          <input
            type="date"
            value={details.product_expiry_at ?? ''}
            onChange={(event) => update('product_expiry_at', event.target.value || null)}
            className={INPUT_CLASS}
          />
        </Field>

        {isVaccine ? (
          <Field label="Uygulama Yolu">
            <select
              value={details.administration_route ?? ''}
              onChange={(event) => update('administration_route', event.target.value || null)}
              className={INPUT_CLASS}
            >
              <option value="">Belirtilmedi</option>
              <option value="parenteral_sc">Deri altı (SC)</option>
              <option value="parenteral_im">Kas içi (IM)</option>
              <option value="intranasal">Burun içi</option>
              <option value="oral">Ağızdan</option>
            </select>
          </Field>
        ) : (
          <>
            <Field label="Uygulama Yöntemi">
              <select
                value={details.application_method ?? ''}
                onChange={(event) => update('application_method', event.target.value || null)}
                className={INPUT_CLASS}
              >
                <option value="">Belirtilmedi</option>
                <option value="oral">Tablet / ağızdan</option>
                <option value="spot_on">Damla</option>
                <option value="injection">Enjeksiyon</option>
                <option value="collar">Tasma</option>
                <option value="spray">Sprey</option>
                <option value="other">Diğer</option>
              </select>
            </Field>
            <Field label="Uygulanan Doz">
              <input
                value={details.applied_dose ?? ''}
                onChange={(event) => update('applied_dose', event.target.value)}
                placeholder="Örn. 1 tablet / 0,5 ml"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Koruma Süresi">
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={details.protection_duration_days ?? ''}
                  onChange={(event) =>
                    update(
                      'protection_duration_days',
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  placeholder="30"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-3 text-[11px] font-semibold text-slate-400">
                  gün
                </span>
              </div>
            </Field>
          </>
        )}

        <Field label="Nerede Uygulandı?">
          <select
            value={details.administration_place ?? ''}
            onChange={(event) =>
              update(
                'administration_place',
                (event.target.value || null) as ApplicationDetails['administration_place']
              )
            }
            className={INPUT_CLASS}
          >
            <option value="">Belirtilmedi</option>
            <option value="home">Evde</option>
            <option value="veterinary_clinic">Veteriner kliniğinde</option>
            <option value="agriculture_directorate">İl/İlçe Tarım Müdürlüğünde</option>
            <option value="municipality">Belediye / kurumda</option>
            <option value="other">Diğer</option>
          </select>
        </Field>

        <Field label="Veteriner / Uygulayan">
          <input
            value={details.provider_name ?? ''}
            onChange={(event) => update('provider_name', event.target.value)}
            placeholder="İsim"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Tutar">
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={details.amount ?? ''}
              onChange={(event) => update('amount', event.target.value ? Number(event.target.value) : null)}
              placeholder="0,00"
              className={INPUT_CLASS}
            />
            <select
              value={details.currency ?? 'TRY'}
              onChange={(event) => update('currency', event.target.value as 'TRY' | 'USD' | 'EUR')}
              className="min-h-11 w-20 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-bold outline-none focus:border-indigo-400"
            >
              <option value="TRY">₺</option>
              <option value="USD">$</option>
              <option value="EUR">€</option>
            </select>
          </div>
        </Field>
      </div>

      {!isVaccine && (
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-[12px] font-bold text-slate-700"
      >
        Diğer Bilgiler
        <ChevronDown className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {!isVaccine && advancedOpen && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!isVaccine && (
            <Field label="Klinik / Kurum">
              <input
                value={details.institution_name ?? ''}
                onChange={(event) => update('institution_name', event.target.value)}
                placeholder="Klinik veya kurum adı"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {!isVaccine && (
            <Field label="Etken Madde">
              <input
                value={details.active_ingredient ?? ''}
                onChange={(event) => update('active_ingredient', event.target.value)}
                placeholder="Varsa etken madde"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {!isVaccine && (
            <Field label="Reaksiyon / Yan Etki">
              <input
                value={details.reaction_observed ?? ''}
                onChange={(event) => update('reaction_observed', event.target.value)}
                placeholder="Gözlenmediyse boş bırakın"
                className={INPUT_CLASS}
              />
            </Field>
          )}
          {!isVaccine && (
            <div className="sm:col-span-2">
              <Field label="Ürün Notu">
                <textarea
                  value={details.product_notes ?? ''}
                  onChange={(event) => update('product_notes', event.target.value)}
                  placeholder="Ürün veya uygulamayla ilgili notlar..."
                  className={`${INPUT_CLASS} min-h-24 resize-none`}
                />
              </Field>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

