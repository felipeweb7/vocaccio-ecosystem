'use client';
import dynamic from 'next/dynamic';
import { FC } from 'react';
const Bridge = dynamic(
  () =>
    import(
      '@gitroom/frontend/components/provider-preview/preview.provider.component'
    ).then((mod) => mod.ProviderPreviewComponent),
  { ssr: false }
);
export const InBridge: FC<{ provider: string }> = ({ provider }) => {
  return <Bridge provider={provider} />;
};
