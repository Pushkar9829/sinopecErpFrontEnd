import { ComboField } from '../ui/ComboField';
import { Field, Grid, inputClass } from '../ui/FormField';
import {
  PRODUCTION_ROUTES,
  applyRoute,
  applyTemplate,
  calcLine,
  formatMoney,
  routeHasCut,
  routeHasPrint,
  setPath,
} from '../../lib/sales';

function opts(options, key) {
  return options?.[key] || [];
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
}) {
  function update(path, value) {
    onChange(setPath(item, path, value));
  }

  function updateRoute(route) {
    onChange(applyRoute(item, route));
  }

  function selectTemplate(templateId) {
    if (!templateId) {
      onChange({ ...item, templateId: '' });
      return;
    }
    const template = templates.find((row) => row.id === templateId);
    if (template) onChange(applyTemplate(item, template));
  }

  const line = showCommercial ? calcLine(item) : null;
  const showPrint = routeHasPrint(item.productionRoute);
  const showBag = routeHasCut(item.productionRoute);

  return (
    <div className="space-y-4 rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{hideTemplate ? 'Template spec' : `Product ${index + 1}`}</p>
        {canEdit && !hideTemplate && index > 0 ? (
          <button type="button" onClick={onRemove} className="text-sm text-red-700 hover:underline">
            Remove
          </button>
        ) : null}
      </div>

      <Grid>
        {!hideTemplate ? (
          <Field label="Use saved template">
            <select
              value={item.templateId || ''}
              disabled={!canEdit}
              onChange={(event) => selectTemplate(event.target.value)}
              className={inputClass}
            >
              <option value="">Manual entry</option>
              {templates
                .filter((template) => template.isActive !== false)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.code ? ` (${template.code})` : ''}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}
        <Field label="Production flow" className={hideTemplate ? 'sm:col-span-2' : ''}>
          <select required value={item.productionRoute} disabled={!canEdit} onChange={(e) => updateRoute(e.target.value)} className={inputClass}>
            {PRODUCTION_ROUTES.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </Field>
      </Grid>

      <p className="text-sm font-medium text-ink">Product</p>
      <Grid>
        <ComboField label="Product" value={item.product} options={templates.map((template) => template.product)} disabled={!canEdit} onChange={(value) => update('product', value)} />
        <Field label="Product code">
          <input value={item.productCode} disabled={!canEdit} onChange={(e) => update('productCode', e.target.value)} className={inputClass} />
        </Field>
        <ComboField label="Product type" value={item.productType} options={opts(options, 'productType')} disabled={!canEdit} onChange={(value) => update('productType', value)} />
        <ComboField label="Size" value={item.size} options={opts(options, 'size')} disabled={!canEdit} onChange={(value) => update('size', value)} />
        <ComboField label="Material" value={item.material} options={opts(options, 'material')} disabled={!canEdit} onChange={(value) => update('material', value)} />
        <ComboField label="Thickness" value={item.thickness} options={opts(options, 'thickness')} disabled={!canEdit} onChange={(value) => update('thickness', value)} />
        <ComboField label="Width" value={item.width} options={opts(options, 'width')} disabled={!canEdit} onChange={(value) => update('width', value)} />
        <ComboField label="Length" value={item.length} options={opts(options, 'length')} disabled={!canEdit} onChange={(value) => update('length', value)} />
        <ComboField label="Color" value={item.color} options={opts(options, 'color')} disabled={!canEdit} onChange={(value) => update('color', value)} />
        <Field label="Quantity">
          <input type="number" min="0" step="any" value={item.quantity} disabled={!canEdit} onChange={(e) => update('quantity', e.target.value)} className={inputClass} />
        </Field>
        <ComboField label="Unit" value={item.unit} options={opts(options, 'unit')} disabled={!canEdit} onChange={(value) => update('unit', value)} />
        {showCommercial ? (
          <>
            <Field label="Rate">
              <input type="number" min="0" step="any" value={item.rate} disabled={!canEdit} onChange={(e) => update('rate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Discount">
              <input type="number" min="0" step="any" value={item.discount} disabled={!canEdit} onChange={(e) => update('discount', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tax %">
              <input type="number" min="0" step="any" value={item.taxPercent} disabled={!canEdit} onChange={(e) => update('taxPercent', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Amount">
              <input readOnly value={formatMoney(line.amount)} className={inputClass} />
            </Field>
          </>
        ) : null}
      </Grid>

      <p className="text-sm font-medium text-ink">Rolling requirement</p>
      <Grid>
        <ComboField label="Raw material" value={item.manufacturing.rawMaterial} options={opts(options, 'rawMaterial')} disabled={!canEdit} onChange={(value) => update('manufacturing.rawMaterial', value)} />
        <ComboField label="Material type" value={item.manufacturing.materialType} options={opts(options, 'materialType')} disabled={!canEdit} onChange={(value) => update('manufacturing.materialType', value)} />
        <ComboField label="Material grade" value={item.manufacturing.materialGrade} options={opts(options, 'materialGrade')} disabled={!canEdit} onChange={(value) => update('manufacturing.materialGrade', value)} />
        <Field label="Required weight">
          <input value={item.manufacturing.requiredWeight} disabled={!canEdit} onChange={(e) => update('manufacturing.requiredWeight', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Required quantity">
          <input value={item.manufacturing.requiredQuantity} disabled={!canEdit} onChange={(e) => update('manufacturing.requiredQuantity', e.target.value)} className={inputClass} />
        </Field>
        <ComboField label="Width" value={item.manufacturing.width} options={opts(options, 'width')} disabled={!canEdit} onChange={(value) => update('manufacturing.width', value)} />
        <ComboField label="Length" value={item.manufacturing.length} options={opts(options, 'length')} disabled={!canEdit} onChange={(value) => update('manufacturing.length', value)} />
        <ComboField label="Thickness" value={item.manufacturing.thickness} options={opts(options, 'thickness')} disabled={!canEdit} onChange={(value) => update('manufacturing.thickness', value)} />
        <ComboField label="Color" value={item.manufacturing.color} options={opts(options, 'color')} disabled={!canEdit} onChange={(value) => update('manufacturing.color', value)} />
        <ComboField label="Additives" value={item.manufacturing.additives} options={opts(options, 'additive')} disabled={!canEdit} onChange={(value) => update('manufacturing.additives', value)} />
        <Field label="Special requirements" className="sm:col-span-2 lg:col-span-3">
          <input value={item.manufacturing.specialRequirements} disabled={!canEdit} onChange={(e) => update('manufacturing.specialRequirements', e.target.value)} className={inputClass} />
        </Field>
      </Grid>

      <p className="text-sm font-medium text-ink">Roll output</p>
      <Grid cols="sm:grid-cols-2 lg:grid-cols-4">
        <ComboField label="Roll width" value={item.roll.width} options={opts(options, 'width')} disabled={!canEdit} onChange={(value) => update('roll.width', value)} />
        <ComboField label="Roll length" value={item.roll.length} options={opts(options, 'length')} disabled={!canEdit} onChange={(value) => update('roll.length', value)} />
        <Field label="Roll weight">
          <input value={item.roll.weight} disabled={!canEdit} onChange={(e) => update('roll.weight', e.target.value)} className={inputClass} />
        </Field>
        <ComboField label="Roll size" value={item.roll.size} options={opts(options, 'size')} disabled={!canEdit} onChange={(value) => update('roll.size', value)} />
      </Grid>

      {showBag ? (
        <>
          <p className="text-sm font-medium text-ink">Cutting / bag requirement</p>
          <Grid cols="sm:grid-cols-2 lg:grid-cols-4">
            <ComboField label="Bag width" value={item.bag.width} options={opts(options, 'width')} disabled={!canEdit} onChange={(value) => update('bag.width', value)} />
            <ComboField label="Bag length" value={item.bag.length} options={opts(options, 'length')} disabled={!canEdit} onChange={(value) => update('bag.length', value)} />
            <Field label="Gusset">
              <input value={item.bag.gusset} disabled={!canEdit} onChange={(e) => update('bag.gusset', e.target.value)} className={inputClass} />
            </Field>
            <ComboField label="Poly bag size" value={item.bag.size} options={opts(options, 'size')} disabled={!canEdit} onChange={(value) => update('bag.size', value)} />
          </Grid>
        </>
      ) : null}

      {showPrint ? (
        <>
          <p className="text-sm font-medium text-ink">Printing requirement</p>
          <Grid>
            <Field label="Artwork">
              <input value={item.printing.artwork} disabled={!canEdit} onChange={(e) => update('printing.artwork', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Impressions">
              <input value={item.printing.impressions} disabled={!canEdit} onChange={(e) => update('printing.impressions', e.target.value)} className={inputClass} />
            </Field>
            <Field label="No. of colours">
              <input value={item.printing.colorCount} disabled={!canEdit} onChange={(e) => update('printing.colorCount', e.target.value)} className={inputClass} />
            </Field>
            <ComboField label="Printing colours" value={item.printing.colors} options={opts(options, 'printColor')} disabled={!canEdit} onChange={(value) => update('printing.colors', value)} />
            <ComboField label="Printing design" value={item.printing.design} options={opts(options, 'printDesign')} disabled={!canEdit} onChange={(value) => update('printing.design', value)} />
            <Field label="Printing requirement">
              <input value={item.printing.requirement} disabled={!canEdit} onChange={(e) => update('printing.requirement', e.target.value)} className={inputClass} />
            </Field>
          </Grid>
        </>
      ) : null}

      {showBag ? (
        <>
          <p className="text-sm font-medium text-ink">Holes</p>
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
                <Field label="No. of holes">
                  <input value={item.holes.count} disabled={!canEdit} onChange={(e) => update('holes.count', e.target.value)} className={inputClass} />
                </Field>
                <ComboField label="Hole type" value={item.holes.type} options={opts(options, 'holeType')} disabled={!canEdit} onChange={(value) => update('holes.type', value)} />
                <ComboField label="Hole size" value={item.holes.size} options={opts(options, 'holeSize')} disabled={!canEdit} onChange={(value) => update('holes.size', value)} />
                <ComboField label="Hole position" value={item.holes.position} options={opts(options, 'holePosition')} disabled={!canEdit} onChange={(value) => update('holes.position', value)} />
              </>
            ) : null}
          </Grid>

          <p className="text-sm font-medium text-ink">Tape</p>
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
        </>
      ) : null}
    </div>
  );
}
