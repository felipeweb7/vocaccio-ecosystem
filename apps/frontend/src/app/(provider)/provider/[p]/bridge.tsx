'use client';
import { FC, useEffect, useRef, useState } from 'react';
import {
  ProviderPreviewComponent,
  type ProviderPreviewHandle,
  type ProviderPreviewProps,
  type ProviderPreviewValidation,
} from '@gitroom/frontend/components/provider-preview/preview.provider.component';

type InitPayload = {
  value?: Record<string, unknown>;
  errors?: string[];
  integration?: ProviderPreviewProps['integration'];
};

declare global {
  interface Window {
    __PROVIDER_INIT__?: InitPayload;
    __getProviderPreviewValues__?: () => Record<string, unknown>;
    __validateProviderPreview__?: () => Promise<ProviderPreviewValidation>;
  }
}

export const ProviderPreviewBridge: FC<{ provider: string }> = ({
  provider,
}) => {
  const [init] = useState<InitPayload>(() =>
    typeof window !== 'undefined' ? window.__PROVIDER_INIT__ ?? {} : {},
  );

  const controlRef = useRef<ProviderPreviewHandle | null>(null);

  useEffect(() => {
    window.__getProviderPreviewValues__ = () =>
      controlRef.current?.getValues() ?? {};
    window.__validateProviderPreview__ = async () =>
      controlRef.current
        ? await controlRef.current.validate()
        : { isValid: false, value: {}, errors: ['not-ready'] };
    return () => {
      delete window.__getProviderPreviewValues__;
      delete window.__validateProviderPreview__;
    };
  }, []);

  return (
    <ProviderPreviewComponent
      provider={provider}
      value={init.value}
      errors={init.errors}
      integration={init.integration}
      controlRef={controlRef}
    />
  );
};
