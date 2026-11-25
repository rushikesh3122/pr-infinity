import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { TextField, type TextFieldProps } from './TextField';

/** TextField bound to React Hook Form; shows the Zod error message for the field. */
export function FormField<T extends FieldValues>({
  control,
  name,
  numeric,
  ...props
}: { control: Control<T>; name: FieldPath<T>; numeric?: boolean } & Omit<TextFieldProps, 'value' | 'onChangeText'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => (
        <TextField
          ref={ref}
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={(t) => onChange(numeric ? t.replace(/[^0-9.]/g, '') : t)}
          onBlur={onBlur}
          error={error?.message}
          keyboardType={numeric ? 'decimal-pad' : props.keyboardType}
          {...props}
        />
      )}
    />
  );
}
