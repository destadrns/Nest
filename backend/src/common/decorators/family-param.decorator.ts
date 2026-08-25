import { SetMetadata } from '@nestjs/common';

export const FAMILY_PARAM_KEY = 'familyParamKey';

/**
 * Override which route parameter contains the familyId (default: 'familyId').
 * @example @FamilyParam('id') for routes like /families/:id
 */
export const FamilyParam = (paramKey: string) => SetMetadata(FAMILY_PARAM_KEY, paramKey);
