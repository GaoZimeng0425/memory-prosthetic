import { BaseEquationPlugin, BaseInlineEquationPlugin } from '@platejs/math'

import {
  EquationElementStatic,
  InlineEquationElementStatic,
} from '@memory-prosthetic/editor/components/ui/equation-node-static'

export const BaseMathKit = [
  BaseInlineEquationPlugin.withComponent(InlineEquationElementStatic),
  BaseEquationPlugin.withComponent(EquationElementStatic),
]
