import { useEffect, useMemo, useRef, useState } from 'react';
import { ComboField } from '../ui/ComboField';
import { Field, Grid, inputClass } from '../ui/FormField';
import { mediaApi } from '../../api/media.api';
import { rateCalculatorApi } from '../../api/rateCalculator.api';
import { useCalculation } from '../../hooks/useCalculation';
import { ImageGallery } from '../ui/ImageGallery';
import {
  PRODUCTION_ROUTES,
  applyRoute,
  applyTemplate,
  formatMoney,
  formatQty,
  impressionColours,
  itemFromApi,
  lineImages,
  routeHasCut,
  routeHasPrint,
  routeHasRoll,
  routeLabel,
  setPath,
} from '../../lib/sales';

const PRODUCT_TONES = [
  { badge: 'bg-orange-600 text-white', shell: 'border-orange-300 bg-orange-50/80', title: 'text-orange-800' },
  { badge: 'bg-sky-600 text-white', shell: 'border-sky-300 bg-sky-50/80', title: 'text-sky-800' },
  { badge: 'bg-violet-600 text-white', shell: 'border-violet-300 bg-violet-50/80', title: 'text-violet-800' },
  { badge: 'bg-teal-600 text-white', shell: 'border-teal-300 bg-teal-50/80', title: 'text-teal-800' },
  { badge: 'bg-emerald-600 text-white', shell: 'border-emerald-300 bg-emerald-50/80', title: 'text-emerald-800' },
  { badge: 'bg-amber-500 text-white', shell: 'border-amber-300 bg-amber-50/80', title: 'text-amber-900' },
];

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6h12" strokeLinecap="round" />
      <path d="M8 6V4h4v2" />
      <path d="M6 6l.7 10h6.6L14 6" strokeLinejoin="round" />
      <path d="M8.5 9v5M11.5 9v5" strokeLinecap="round" />
    </svg>
  );
}

function productLabel(template) {
  const name = template.name || template.product || 'Product';
  return template.code ? `${name} · ${template.code}` : name;
}

function SavedProductMenu({ templates, value, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const current = templates.find((template) => template.id === value);

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative mt-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Saved product"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-left text-sm font-normal text-ink disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-60"
      >
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-slate'}`}>
          {current ? productLabel(current) : 'Select any'}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {templates.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-slate">No saved products</p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onChange(template.id);
                  setOpen(false);
                }}
                className={`flex w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  template.id === value ? 'bg-paper font-semibold text-ink' : 'text-ink hover:bg-paper'
                }`}
              >
                {productLabel(template)}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function opts(options, key) {
  return options?.[key] || [];
}

function RollingResult({ calc, showCommercial }) {
  const { result, error, retry } = calc;
  if (error) {
    return (
      <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-3">
        {error}{' '}
        <button type="button" onClick={retry} className="font-semibold underline">
          Retry
        </button>
      </p>
    );
  }
  if (!result?.ready) {
    return <p className="text-sm text-slate sm:col-span-2 lg:col-span-3">Enter width, length (inches) and gauge to calculate the weight.</p>;
  }
  const rows = [
    { label: 'Weight per 1,000 pcs', value: `${formatQty(result.weightPer1000)} kg`, working: result.weightWorking },
    { label: 'Total weight', value: result.totalWeight > 0 ? `${formatQty(result.totalWeight)} kg` : '—', working: result.totalWorking || 'Enter quantity in pcs' },
  ];
  if (showCommercial) {
    rows.push(
      { label: 'Material per 1,000 pcs', value: formatMoney(result.materialPer1000) },
      { label: 'Total material cost', value: result.totalWeight > 0 ? formatMoney(result.totalMaterial) : '—' }
    );
  }
  return (
    <div className="grid gap-2 rounded-lg border border-line bg-paper p-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4" aria-label="Rolling calculation">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-xs font-semibold text-slate">{row.label}</p>
          <p className="text-base font-semibold text-ink">{row.value}</p>
          {row.working ? <p className="text-xs text-slate">{row.working}</p> : null}
        </div>
      ))}
    </div>
  );
}

function SpecSection({ title, dot, children, defaultOpen = false, titleClass = 'text-ink' }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <h2 className={`min-w-0 flex-1 truncate text-base font-semibold ${titleClass}`}>{title}</h2>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-slate transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="space-y-3 border-t border-line px-4 py-3">{children}</div> : null}
    </section>
  );
}

export function SalesOrderLineCard({
  item,
  index,
  onChange,
  onRemove,
  showCommercial,
  canEdit,
  templates = [],
  options = {},
  hideTemplate = false,
  removable,
  routes = PRODUCTION_ROUTES,
}) {
  function update(path, value) {
    onChange(setPath(item, path, value));
  }

  function updateWidth(value) {
    const next = { ...item, width: value, size: '' };
    const followsWidth = !item.roll.width || item.roll.width === item.width;
    onChange(followsWidth ? setPath(next, 'roll.width', value) : next);
  }

  function updateLength(value) {
    onChange({ ...item, length: value, size: '' });
  }

  function updateRoute(route) {
    onChange(applyRoute(item, route));
  }

  function selectTemplate(templateId) {
    const template = templates.find((row) => row.id === templateId);
    if (!template) return;
    if (hideTemplate) {
      const next = itemFromApi(template);
      next.templateId = '';
      next.id = item.id;
      next.uid = item.uid || next.uid;
      if (!next.product) next.product = template.name || '';
      if (!next.productCode) next.productCode = template.code || '';
      onChange(next);
      return;
    }
    onChange(applyTemplate(item, template));
  }

  const [uploadingImages, setUploadingImages] = useState(false);

  const [imageError, setImageError] = useState('');

  function addImages(added) {
    onChange((row) => {
      const images = [...lineImages(row), ...added].slice(0, 20);
      return { ...row, images, image: images[0] || row.image };
    });
  }

  async function onImagePick(files) {
    setImageError('');
    const current = lineImages(item);
    const room = 20 - current.length;
    if (room <= 0) {
      setImageError('A product can have at most 20 images.');
      return;
    }
    const chosen = files.slice(0, room);
    for (const file of chosen) {
      if (!file.type.startsWith('image/')) {
        setImageError(`${file.name} is not an image.`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setImageError(`${file.name} must be under 15 MB.`);
        return;
      }
    }
    if (chosen.length < files.length) {
      setImageError('Only the first images that fit the limit of 20 were added.');
    }
    setUploadingImages(true);
    const added = [];
    try {
      for (const file of chosen) {
        const uploaded = await mediaApi.upload(file, 'products');
        added.push({
          originalName: uploaded.originalName || file.name,
          mimeType: uploaded.mimeType || file.type,
          dataUrl: '',
          url: uploaded.url || '',
          key: uploaded.key || '',
          storage: uploaded.storage || uploaded.storageMode || '',
        });
      }
      addImages(added);
    } catch (err) {
      if (added.length) addImages(added);
      setImageError(err.message || 'Image upload failed');
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(indexToRemove) {
    onChange((row) => {
      const images = lineImages(row).filter((_, imageIndex) => imageIndex !== indexToRemove);
      return {
        ...row,
        images,
        image: images[0] || { originalName: '', mimeType: '', dataUrl: '', url: '', key: '', storage: '' },
      };
    });
  }

  const { width: rollWidth, length: rollLength, thickness: rollGauge } = item;
  const { materialRate } = item.manufacturing;
  const rolls = routeHasRoll(item.productionRoute);
  const rollingInput = useMemo(
    () =>
      rolls && rollWidth && rollLength && rollGauge
        ? { width: rollWidth, length: rollLength, gauge: rollGauge, materialRate, quantity: item.quantity, unit: item.unit }
        : null,
    [rolls, rollWidth, rollLength, rollGauge, materialRate, item.quantity, item.unit]
  );
  const rollingCalc = useCalculation(rateCalculatorApi.rolling, rollingInput);
  const autoWeight = rollingInput && rollingCalc.result?.totalWeight > 0 ? String(rollingCalc.result.totalWeight) : '';

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const storedWeight = item.manufacturing.requiredWeight;
  const lastAutoWeight = useRef('');
  useEffect(() => {
    if (!canEdit) return;
    if (autoWeight) {
      lastAutoWeight.current = autoWeight;
      if (storedWeight !== autoWeight) onChangeRef.current((row) => setPath(row, 'manufacturing.requiredWeight', autoWeight));
      return;
    }
    if (!rollingCalc.loading && lastAutoWeight.current && storedWeight === lastAutoWeight.current) {
      lastAutoWeight.current = '';
      onChangeRef.current((row) => setPath(row, 'manufacturing.requiredWeight', ''));
    }
  }, [autoWeight, canEdit, storedWeight, rollingCalc.loading]);

  const [open, setOpen] = useState(index === 0);
  const showPrint = routeHasPrint(item.productionRoute);
  const showCut = routeHasCut(item.productionRoute);
  const tone = PRODUCT_TONES[index % PRODUCT_TONES.length];
  const canRemove = canEdit && !hideTemplate && (removable ?? index > 0);
  const summary = [item.productCode, item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '', routeLabel(item.productionRoute)]
    .filter(Boolean)
    .join(' · ');
  const productLabel = item.product?.trim() || `Product ${index + 1}`;
  const titleClass = hideTemplate ? 'text-ink' : tone.title;
  function sectionTitle(name) {
    if (hideTemplate) return name;
    if (name === 'Product') return productLabel;
    return `${productLabel} · ${name}`;
  }

  const sections = (
    <div className="space-y-3">
      <SpecSection title={sectionTitle('Product')} dot="bg-orange-600" defaultOpen titleClass={titleClass}>
      <Grid>
        {hideTemplate ? null : (
          <Field label="Saved product">
            <SavedProductMenu
              templates={templates.filter((template) => template.isActive !== false)}
              value={item.templateId || ''}
              disabled={!canEdit}
              onChange={selectTemplate}
            />
          </Field>
        )}
        <Field label="Production flow" mark>
          <select required value={item.productionRoute} disabled={!canEdit} onChange={(e) => updateRoute(e.target.value)} className={inputClass}>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </Field>
      </Grid>
      <Grid>
        <ComboField label="Product" mark value={item.product} options={templates.map((template) => template.product)} disabled={!canEdit} onChange={(value) => update('product', value)} />
        <Field label="Product code" mark>
          <input value={item.productCode} disabled={!canEdit} onChange={(e) => update('productCode', e.target.value)} className={inputClass} />
        </Field>
        <ComboField label="Product type" mark value={item.productType} options={opts(options, 'productType')} disabled={!canEdit} onChange={(value) => update('productType', value)} />
        <ComboField label="Width" mark value={item.width} options={opts(options, 'width')} disabled={!canEdit} onChange={updateWidth} />
        <ComboField label="Length" mark value={item.length} options={opts(options, 'length')} disabled={!canEdit} onChange={updateLength} />
        <ComboField label="Material" mark value={item.material} options={opts(options, 'material')} disabled={!canEdit} onChange={(value) => update('material', value)} />
        <ComboField label="Gauge" value={item.thickness} options={opts(options, 'thickness')} disabled={!canEdit} onChange={(value) => update('thickness', value)} />
        <ComboField label="Colour" value={item.color} options={opts(options, 'color')} disabled={!canEdit} onChange={(value) => update('color', value)} />
        {hideTemplate ? null : (
          <Field label="Quantity" mark>
            <input type="number" min="0" step="any" value={item.quantity} disabled={!canEdit} onChange={(e) => update('quantity', e.target.value)} className={inputClass} />
          </Field>
        )}
        <ComboField label="Unit" mark value={item.unit} options={opts(options, 'unit')} disabled={!canEdit} onChange={(value) => update('unit', value)} />
        {showCommercial ? (
          <>
            <Field label="Rate">
              <input type="number" min="0" step="any" value={item.rate} disabled={!canEdit} onChange={(e) => update('rate', e.target.value)} className={inputClass} />
            </Field>
            {hideTemplate ? null : (
              <>
                <Field label="Line discount (₹)">
                  <input type="number" min="0" step="any" value={item.discount} disabled={!canEdit} onChange={(e) => update('discount', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Tax %">
                  <input type="number" min="0" max="100" step="any" value={item.taxPercent} disabled={!canEdit} onChange={(e) => update('taxPercent', e.target.value)} className={inputClass} />
                </Field>
              </>
            )}
          </>
        ) : null}
        <ComboField
          label="Special requirements"
          value={item.manufacturing.specialRequirements}
          options={opts(options, 'specialRequirement')}
          disabled={!canEdit}
          onChange={(value) => update('manufacturing.specialRequirements', value)}
          className="sm:col-span-2 lg:col-span-3"
        />
      </Grid>
      </SpecSection>

      <SpecSection title={sectionTitle('Product images')} dot="bg-slate-500" titleClass={titleClass}>
        <ImageGallery
          images={lineImages(item)}
          canEdit={canEdit}
          busy={uploadingImages}
          onUpload={onImagePick}
          onRemove={removeImage}
          hint="Choose one or more images. PNG or JPG, up to 15 MB each."
        />
        {imageError ? <p className="mt-2 text-sm text-red-700">{imageError}</p> : null}
      </SpecSection>

      {rolls ? (
      <>
      <SpecSection title={sectionTitle('Rolling requirement')} dot="bg-orange-600" titleClass={titleClass}>
      <Grid>
        <ComboField label="Material type" value={item.manufacturing.materialType} options={opts(options, 'materialType')} disabled={!canEdit} onChange={(value) => update('manufacturing.materialType', value)} />
        <ComboField label="Material grade" value={item.manufacturing.materialGrade} options={opts(options, 'materialGrade')} disabled={!canEdit} onChange={(value) => update('manufacturing.materialGrade', value)} />
        <Field
          label={autoWeight ? 'Required weight (kg, auto)' : 'Required weight (kg)'}
          mark={!autoWeight && String(item.unit || '').toLowerCase() !== 'kg'}
        >
          <input
            value={item.manufacturing.requiredWeight}
            disabled={!canEdit}
            readOnly={Boolean(autoWeight)}
            onChange={(e) => update('manufacturing.requiredWeight', e.target.value)}
            className={`${inputClass} ${autoWeight ? 'bg-paper' : ''}`}
          />
        </Field>
        {showCommercial ? (
          <Field label="Material rate (₹ / kg)">
            <input type="number" min="0" step="any" value={item.manufacturing.materialRate} disabled={!canEdit} onChange={(e) => update('manufacturing.materialRate', e.target.value)} className={inputClass} />
          </Field>
        ) : null}
        <ComboField label="Additives" value={item.manufacturing.additives} options={opts(options, 'additive')} disabled={!canEdit} onChange={(value) => update('manufacturing.additives', value)} />
        <RollingResult calc={rollingCalc} showCommercial={showCommercial} />
      </Grid>
      </SpecSection>

      <SpecSection title={sectionTitle('Roll output')} dot="bg-sky-600" titleClass={titleClass}>
      <Grid>
        <ComboField label="Roll width" value={item.roll.width} options={opts(options, 'width')} disabled={!canEdit} onChange={(value) => update('roll.width', value)} />
        <ComboField label="Roll length" value={item.roll.length} options={opts(options, 'length')} disabled={!canEdit} onChange={(value) => update('roll.length', value)} />
        <Field label="Roll weight">
          <input value={item.roll.weight} disabled={!canEdit} onChange={(e) => update('roll.weight', e.target.value)} className={inputClass} />
        </Field>
      </Grid>
      </SpecSection>
      </>
      ) : null}

      {showPrint ? (
      <SpecSection title={sectionTitle('Printing requirement')} dot="bg-sky-600" titleClass={titleClass}>
      <Grid>
        <ComboField
          label={impressionColours(item.printing.impressions) ? `Impression (${impressionColours(item.printing.impressions)} colours)` : 'Impression'}
          value={item.printing.impressions}
          options={opts(options, 'printImpression')}
          disabled={!canEdit}
          mark={!item.printing.colors}
          onChange={(value) => update('printing.impressions', value)}
        />
        <ComboField label="Printing colours" mark={!impressionColours(item.printing.impressions)} value={item.printing.colors} options={opts(options, 'printColor')} disabled={!canEdit} onChange={(value) => update('printing.colors', value)} />
        <ComboField label="Printing design" value={item.printing.design} options={opts(options, 'printDesign')} disabled={!canEdit} onChange={(value) => update('printing.design', value)} />
        <Field label="Note" className="sm:col-span-2 lg:col-span-3">
          <input value={item.printing.artwork} disabled={!canEdit} onChange={(e) => update('printing.artwork', e.target.value)} className={inputClass} />
        </Field>
      </Grid>
      </SpecSection>
      ) : null}

      {showCut ? (
      <>
      <SpecSection title={sectionTitle('Cutting / bag requirement')} dot="bg-violet-600" titleClass={titleClass}>
      <Grid>
        <Field label="Gusset">
          <input value={item.bag.gusset} disabled={!canEdit} onChange={(e) => update('bag.gusset', e.target.value)} className={inputClass} />
        </Field>
      </Grid>
      </SpecSection>

      <SpecSection title={sectionTitle('Holes')} dot="bg-violet-600" titleClass={titleClass}>
      <Grid>
        <Field label="Hole required">
          <select
            value={item.holes.required ? 'yes' : 'no'}
            disabled={!canEdit}
            onChange={(e) => update('holes.required', e.target.value === 'yes')}
            className={inputClass}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        {item.holes.required ? (
          <>
            <ComboField label="No. of holes" value={item.holes.count} options={opts(options, 'holeCount')} disabled={!canEdit} onChange={(value) => update('holes.count', value)} />
            <ComboField label="Hole type" value={item.holes.type} options={opts(options, 'holeType')} disabled={!canEdit} onChange={(value) => update('holes.type', value)} />
            <ComboField label="Hole size" value={item.holes.size} options={opts(options, 'holeSize')} disabled={!canEdit} onChange={(value) => update('holes.size', value)} />
            <ComboField label="Hole position" value={item.holes.position} options={opts(options, 'holePosition')} disabled={!canEdit} onChange={(value) => update('holes.position', value)} />
          </>
        ) : null}
      </Grid>
      </SpecSection>

      <SpecSection title={sectionTitle('Tape')} dot="bg-teal-600" titleClass={titleClass}>
      <Grid cols="sm:grid-cols-2">
        <Field label="Tape required">
          <select
            value={item.tape.required ? 'yes' : 'no'}
            disabled={!canEdit}
            onChange={(e) => update('tape.required', e.target.value === 'yes')}
            className={inputClass}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        {item.tape.required ? (
          <ComboField label="Tape type" value={item.tape.type} options={opts(options, 'tapeType')} disabled={!canEdit} onChange={(value) => update('tape.type', value)} />
        ) : null}
      </Grid>
      </SpecSection>
      </>
      ) : null}
    </div>
  );

  if (hideTemplate) return sections;

  return (
    <section className={`overflow-hidden rounded-xl border-2 ${tone.shell}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tone.badge}`}>{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-ink">{item.product || `Product ${index + 1}`}</span>
            {summary ? <span className="block truncate text-sm font-normal text-slate">{summary}</span> : null}
          </span>
          <svg
            viewBox="0 0 20 20"
            className={`ml-auto h-4 w-4 shrink-0 text-ink transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <TrashIcon />
            Remove
          </button>
        ) : null}
      </div>
      {open ? <div className="border-t border-line/80 bg-card p-3">{sections}</div> : null}
    </section>
  );
}
