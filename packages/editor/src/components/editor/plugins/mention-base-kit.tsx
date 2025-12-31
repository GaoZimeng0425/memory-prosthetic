import { BaseMentionPlugin } from '@platejs/mention'

import { MentionElementStatic } from '@memory-prosthetic/editor/components/ui/mention-node-static'

export const BaseMentionKit = [BaseMentionPlugin.withComponent(MentionElementStatic)]
