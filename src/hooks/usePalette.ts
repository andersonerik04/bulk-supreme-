import { useSettings } from './useSettings';
import { paletteFor } from '@/utils/palette';

export const usePalette = () => paletteFor(useSettings().theme);
