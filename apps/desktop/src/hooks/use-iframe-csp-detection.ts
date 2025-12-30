import { useEffect, useRef, useState } from 'react'

type UseIframeCspDetectionReturn = {
  error: boolean
  isLoading: boolean
  iframeRef: React.RefObject<HTMLIFrameElement | null>
}

/**
 * Hook to detect CSP (Content Security Policy) errors when loading URLs in iframe
 * Returns error state, loading state, and iframe ref
 */
export const useIframeCspDetection = (url: string | null, enabled: boolean): UseIframeCspDetectionReturn => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!enabled || !iframeRef.current || !url) {
      setIsLoading(false)
      setError(false)
      return
    }

    const iframe = iframeRef.current
    let checkTimeoutId: NodeJS.Timeout
    let detectionTimeoutId: NodeJS.Timeout
    let hasDetectedError = false

    // Reset states when URL changes
    setIsLoading(true)
    setError(false)
    hasDetectedError = false

    // 监听安全策略违规事件（CSP）
    const handleSecurityPolicyViolation = (event: SecurityPolicyViolationEvent) => {
      if (
        event.violatedDirective === 'frame-ancestors' ||
        event.violatedDirective === 'frame-src' ||
        event.blockedURI?.includes(url)
      ) {
        hasDetectedError = true
        setError(true)
        setIsLoading(false)
        if (checkTimeoutId) {
          clearTimeout(checkTimeoutId)
        }
        if (detectionTimeoutId) {
          clearTimeout(detectionTimeoutId)
        }
      }
    }

    // 监听全局错误事件来捕获 CSP 错误
    const handleGlobalError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.toString() || ''
      // 检查是否是 CSP frame-ancestors 错误
      if (
        errorMessage.includes('frame-ancestors') ||
        errorMessage.includes('Refused to display') ||
        errorMessage.includes('Refused to frame') ||
        errorMessage.includes('X-Frame-Options') ||
        errorMessage.includes('because it does not appear in the frame-ancestors')
      ) {
        hasDetectedError = true
        setError(true)
        setIsLoading(false)
        if (checkTimeoutId) {
          clearTimeout(checkTimeoutId)
        }
        if (detectionTimeoutId) {
          clearTimeout(detectionTimeoutId)
        }
      }
    }

    // 更可靠的检测方法：尝试访问 iframe 的 location 和检查页面状态
    const detectCSPError = () => {
      if (hasDetectedError) return

      try {
        const contentWindow = iframe.contentWindow
        if (!contentWindow) {
          setError(true)
          setIsLoading(false)
          hasDetectedError = true
          return
        }

        // 方法1: 尝试访问 location.href
        try {
          const location = contentWindow.location
          const href = location.href

          // 如果 location.href 是 about:blank，说明页面被阻止加载
          if (href === 'about:blank') {
            setError(true)
            setIsLoading(false)
            hasDetectedError = true
            return
          }

          // 如果 href 与预期 URL 不匹配（且不是跨域导致的），可能是被阻止
          // 注意：跨域时可能无法访问 location.href，会抛出错误
        } catch {
          // 跨域访问 location 会抛出错误，这是正常的
          // 继续其他检测方法
        }

        // 方法2: 检查 iframe 的尺寸和可见性
        const rect = iframe.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) {
          // iframe 尺寸为 0，可能是被阻止了
          setError(true)
          setIsLoading(false)
          hasDetectedError = true
          return
        }

        // 方法3: 检查 iframe 的 contentDocument（跨域时无法访问）
        try {
          const doc = iframe.contentDocument
          if (!doc || doc.body === null) {
            // 如果无法访问文档或文档为空，可能是被阻止
            // 但跨域时也会无法访问，所以不能作为唯一判断
          }
        } catch {
          // 跨域访问会抛出错误，这是正常的
        }

        // 如果所有检测都通过，清除错误状态并标记为加载完成
        if (!hasDetectedError) {
          setIsLoading(false)
        }
      } catch {
        // 如果检测过程出错，可能是跨域限制，但不一定是 CSP 错误
        setIsLoading(false)
      }
    }

    const handleLoad = () => {
      // 页面加载后，延迟检查是否真的加载成功
      checkTimeoutId = setTimeout(() => {
        detectCSPError()
      }, 1500)
    }

    const handleError = () => {
      hasDetectedError = true
      setError(true)
      setIsLoading(false)
      if (checkTimeoutId) {
        clearTimeout(checkTimeoutId)
      }
      if (detectionTimeoutId) {
        clearTimeout(detectionTimeoutId)
      }
    }

    // 设置检测超时：如果 3 秒后仍然无法确定，进行最终检测
    detectionTimeoutId = setTimeout(() => {
      if (!hasDetectedError) {
        detectCSPError()
      }
    }, 3000)

    // 监听安全策略违规事件
    document.addEventListener('securitypolicyviolation', handleSecurityPolicyViolation)

    // 监听全局错误
    window.addEventListener('error', handleGlobalError, true)

    // 监听 iframe 事件
    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityPolicyViolation)
      window.removeEventListener('error', handleGlobalError, true)
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
      if (checkTimeoutId) {
        clearTimeout(checkTimeoutId)
      }
      if (detectionTimeoutId) {
        clearTimeout(detectionTimeoutId)
      }
    }
  }, [enabled, url])

  return {
    error,
    isLoading,
    iframeRef,
  }
}
