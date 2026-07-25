import { SetMetadata } from '@nestjs/common';

export const DEPRECATED_METADATA = 'deprecated_version';
export const SUNSET_METADATA = 'sunset_date';

export function Deprecated(version: string, sunsetDate?: string) {
  const defaultSunset = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString().split('T')[0];

  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      SetMetadata(DEPRECATED_METADATA, version)(
        target,
        propertyKey,
        descriptor,
      );
      SetMetadata(SUNSET_METADATA, sunsetDate || defaultSunset)(
        target,
        propertyKey,
        descriptor,
      );
    }
    return descriptor;
  };
}
