import { router } from 'expo-router';
import { LeadForm } from '../../features/leads/LeadForm';
import { useCreateLead } from '../../hooks/queries';
import { useToast } from '../../providers/ToastProvider';
import { getErrorMessage } from '../../api/client';

export default function NewLeadScreen() {
  const create = useCreateLead();
  const toast = useToast();
  return (
    <LeadForm
      submitLabel="Save Lead"
      showStatusNote
      onSubmit={async (values) => {
        try {
          const lead = await create.mutateAsync(values);
          toast.success('Lead added');
          router.replace(`/leads/${lead._id}`);
        } catch (err) {
          toast.error(getErrorMessage(err));
          throw err;
        }
      }}
    />
  );
}
