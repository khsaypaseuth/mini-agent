import { RequestStatus } from '@mini-agent/types';

const STYLES: Record<string, string> = {
  [RequestStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [RequestStatus.SUBMITTED]: 'bg-blue-100 text-blue-700',
  [RequestStatus.AWAITING_PAYMENT]: 'bg-amber-100 text-amber-800',
  [RequestStatus.PAID]: 'bg-emerald-100 text-emerald-700',
  [RequestStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-700',
  [RequestStatus.CERTIFICATE_UPLOADED]: 'bg-violet-100 text-violet-700',
  [RequestStatus.READY_FOR_DELIVERY]: 'bg-cyan-100 text-cyan-700',
  [RequestStatus.PICKED_UP]: 'bg-teal-100 text-teal-700',
  [RequestStatus.IN_TRANSIT]: 'bg-sky-100 text-sky-700',
  [RequestStatus.DELIVERED]: 'bg-green-100 text-green-700',
  [RequestStatus.COMPLETED]: 'bg-green-600 text-white',
  [RequestStatus.CANCELLED]: 'bg-red-100 text-red-700',
  [RequestStatus.ON_HOLD]: 'bg-orange-100 text-orange-700',
  [RequestStatus.NEEDS_MORE_INFO]: 'bg-yellow-100 text-yellow-800',
  [RequestStatus.REFUNDED]: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
