import { BaseCommentPlugin } from '@platejs/comment'

import { CommentLeafStatic } from '@memory-prosthetic/editor/components/ui/comment-node-static'

export const BaseCommentKit = [BaseCommentPlugin.withComponent(CommentLeafStatic)]
