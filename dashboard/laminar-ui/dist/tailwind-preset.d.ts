import { Config } from 'tailwindcss';

/**
 * E6Data Design System Tailwind Preset
 *
 * This preset provides the foundation for the e6data design system.
 * Import and extend this in your app's tailwind.config.ts:
 *
 * @example
 * import { e6Preset } from '@e6data/design-system/tailwind-preset'
 *
 * export default {
 *   presets: [e6Preset],
 *   content: [...],
 * } satisfies Config
 */
declare const e6Preset: Partial<Config>;
export default e6Preset;
export { e6Preset }

export { }
