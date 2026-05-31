import { redirect } from 'next/navigation';
import { defaultLocale } from '@mini-agent/i18n';

export default function RootIndex() {
  redirect(`/${defaultLocale}`);
}
