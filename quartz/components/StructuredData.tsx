import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"
import { unescapeHTML } from "../util/escape"

export default (() => {
  const StructuredData: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const socialUrl = fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)
    
    const title = fileData.frontmatter?.title ?? "Journey's Blog"
    const description = fileData.frontmatter?.description ?? unescapeHTML(fileData.description?.trim() ?? "iOS 개발과 Swift 프로그래밍에 대한 블로그")
    const publishedTime = fileData.frontmatter?.date ? new Date(fileData.frontmatter.date).toISOString() : new Date().toISOString()
    const modifiedTime = fileData.dates?.modified ? new Date(fileData.dates.modified).toISOString() : publishedTime

    // 웹사이트 구조화된 데이터
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Journey's Blog",
      "description": "iOS 개발과 Swift 프로그래밍에 대한 기술 블로그",
      "url": `https://${cfg.baseUrl}`,
      "author": {
        "@type": "Person",
        "name": "Journey",
        "url": `https://${cfg.baseUrl}`
      },
      "publisher": {
        "@type": "Person",
        "name": "Journey"
      },
      "inLanguage": "ko-KR",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `https://${cfg.baseUrl}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    }

    // 개별 페이지 구조화된 데이터
    const articleSchema = fileData.slug === "index" ? null : {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": title,
      "description": description,
      "url": socialUrl,
      "datePublished": publishedTime,
      "dateModified": modifiedTime,
      "author": {
        "@type": "Person",
        "name": "Journey",
        "url": `https://${cfg.baseUrl}`
      },
      "publisher": {
        "@type": "Person",
        "name": "Journey"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": socialUrl
      },
      "inLanguage": "ko-KR",
      "keywords": fileData.frontmatter?.tags?.join(", ") || "iOS, Swift, SwiftUI, 개발, 프로그래밍"
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        {articleSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(articleSchema)
            }}
          />
        )}
      </>
    )
  }

  return StructuredData
}) satisfies QuartzComponentConstructor
