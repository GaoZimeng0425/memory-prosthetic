import { BaseSuggestionPlugin } from '@platejs/suggestion'

import { SuggestionLeafStatic } from '@memory-prosthetic/editor/components/ui/suggestion-node-static'

export const BaseSuggestionKit = [BaseSuggestionPlugin.withComponent(SuggestionLeafStatic)]
