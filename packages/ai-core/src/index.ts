// ⚠️  SERVER-ONLY PACKAGE
// This package must NEVER be imported in browser/client code.
// It contains OpenAI API logic, therapy knowledge, and prompt construction.
// Importing in a browser context will expose sensitive system prompts.

export { buildTherapistSystemPrompt } from './prompt-builder';
export { ALL_FRAMEWORKS, CBT_FRAMEWORK, DBT_FRAMEWORK, ACT_FRAMEWORK, SOMATIC_FRAMEWORK, PSYCHODYNAMIC_FRAMEWORK } from './therapy-frameworks';
export { selectFrameworksFast, getFrameworkText, DEFAULT_SELECTION, FRAMEWORK_MAP } from './framework-selector';
export type { FrameworkSelectionInput, FrameworkSelection } from './framework-selector';
