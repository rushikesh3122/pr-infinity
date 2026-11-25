import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { goBack } from '../../../utils/navigation';
import { LeadForm } from '../../../features/leads/LeadForm';
import { useLead, useUpdateLead } from '../../../hooks/queries';
import { useToast } from '../../../providers/ToastProvider';
import { getErrorMessage } from '../../../api/client';
import { ErrorView, LoadingView } from '../../../components/ui';

export default function EditLeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lead, isLoading, error, refetch } = useLead(id);
  const update = useUpdateLead(id);
  const toast = useToast();

  const defaults = useMemo(
    () =>
      lead
        ? { customerName: lead.customerName, mobileNumber: lead.mobileNumber, address: lead.address, email: lead.email ?? '', description: lead.description ?? '' }
        : undefined,
    [lead],
  );

  if (isLoading) return <LoadingView />;
  if (error || !lead || !defaults) return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <LeadForm
      defaultValues={defaults}
      defaultDate={new Date(lead.leadDate)}
      submitLabel="Save Changes"
      onSubmit={async (values) => {
        try {
          await update.mutateAsync(values);
          toast.success('Lead updated');
          goBack(`/leads/${id}`);
        } catch (err) {
          toast.error(getErrorMessage(err));
          throw err;
        }
      }}
    />
  );
}
