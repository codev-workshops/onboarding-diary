import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Department } from '../../api/auth';
import type { ChecklistTemplate, ChecklistTemplatePayload } from '../../api/checklists';
import { taskCategories } from '../../api/tasks';
import { buttonClass, FormField, inputClass } from '../../components/FormField';
import { Modal, ServerErrors } from '../../components/Modal';
import { zodResolver } from '../../lib/zod-resolver';

const templateSchema = z.object({
  name: z.string().trim().min(3, 'Enter a template name.').max(120),
  description: z.string().max(1000),
  departmentId: z.string(),
  isActive: z.boolean(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(3, 'Enter an item title.').max(120),
        description: z.string().max(5000),
        category: z.enum(taskCategories),
        dueOffsetDays: z.string(),
      })
    )
    .min(1, 'A template needs at least one item.'),
});

type TemplateForm = z.infer<typeof templateSchema>;

const emptyItem = { title: '', description: '', category: 'Setup' as const, dueOffsetDays: '0' };

export function ChecklistTemplateDialog({
  template,
  departments,
  pending,
  error,
  onSave,
  onClose,
}: {
  template: ChecklistTemplate | null;
  departments: Department[];
  pending: boolean;
  error: unknown;
  onSave: (payload: ChecklistTemplatePayload) => void;
  onClose: () => void;
}) {
  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name ?? '',
      description: template?.description ?? '',
      departmentId: template?.departmentId === null ? '' : String(template?.departmentId ?? ''),
      isActive: template?.isActive ?? true,
      items:
        template === null
          ? [emptyItem]
          : template.items.map((item) => ({
              title: item.title,
              description: item.description ?? '',
              category: item.category,
              dueOffsetDays: item.dueOffsetDays === null ? '' : String(item.dueOffsetDays),
            })),
    },
  });

  const items = useFieldArray({ control: form.control, name: 'items' });

  const submit = (values: TemplateForm) =>
    onSave({
      name: values.name,
      description: values.description === '' ? null : values.description,
      departmentId: values.departmentId === '' ? null : Number(values.departmentId),
      isActive: values.isActive,
      items: values.items.map((item) => ({
        title: item.title,
        description: item.description === '' ? null : item.description,
        category: item.category,
        dueOffsetDays: item.dueOffsetDays === '' ? null : Number(item.dueOffsetDays),
      })),
    });

  return (
    <Modal
      title={template ? `Edit ${template.name}` : 'New checklist template'}
      titleId="checklist-template-dialog-title"
      onClose={onClose}
    >
      <form className="mt-4 space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
        <FormField label="Name" htmlFor="template-name" error={form.formState.errors.name?.message}>
          <input id="template-name" className={inputClass} {...form.register('name')} />
        </FormField>

        <FormField
          label="Description"
          htmlFor="template-description"
          error={form.formState.errors.description?.message}
        >
          <textarea
            id="template-description"
            rows={2}
            className={inputClass}
            {...form.register('description')}
          />
        </FormField>

        <FormField label="Department" htmlFor="template-departmentId">
          <select
            id="template-departmentId"
            className={inputClass}
            {...form.register('departmentId')}
          >
            <option value="">Every department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register('isActive')} />
          Active — recruits can apply it
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">Items, in order</legend>
          {form.formState.errors.items?.root?.message ? (
            <p role="alert" className="text-sm text-red-600">
              {form.formState.errors.items.root.message}
            </p>
          ) : null}

          {items.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Item {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    aria-label={`Move item ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => items.move(index, index - 1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    aria-label={`Move item ${index + 1} down`}
                    disabled={index === items.fields.length - 1}
                    onClick={() => items.move(index, index + 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={items.fields.length === 1}
                    onClick={() => items.remove(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <FormField
                label="Title"
                htmlFor={`item-${index}-title`}
                error={form.formState.errors.items?.[index]?.title?.message}
              >
                <input
                  id={`item-${index}-title`}
                  className={inputClass}
                  {...form.register(`items.${index}.title`)}
                />
              </FormField>

              <FormField label="Description" htmlFor={`item-${index}-description`}>
                <textarea
                  id={`item-${index}-description`}
                  rows={2}
                  className={inputClass}
                  {...form.register(`items.${index}.description`)}
                />
              </FormField>

              <div className="grid gap-2 sm:grid-cols-2">
                <FormField label="Category" htmlFor={`item-${index}-category`}>
                  <select
                    id={`item-${index}-category`}
                    className={inputClass}
                    {...form.register(`items.${index}.category`)}
                  >
                    {taskCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Days after start date"
                  htmlFor={`item-${index}-dueOffsetDays`}
                  error={form.formState.errors.items?.[index]?.dueOffsetDays?.message}
                >
                  <input
                    id={`item-${index}-dueOffsetDays`}
                    type="number"
                    min={0}
                    max={365}
                    className={inputClass}
                    {...form.register(`items.${index}.dueOffsetDays`)}
                  />
                </FormField>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
            onClick={() => items.append(emptyItem)}
          >
            Add item
          </button>
        </fieldset>

        <ServerErrors error={error} />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className={buttonClass} disabled={pending}>
            {pending ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
