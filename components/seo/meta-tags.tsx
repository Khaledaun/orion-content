import Head from "next/head";

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export function MetaTags({
  title,
  description,
  keywords = [],
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
}: MetaTagsProps) {
  const siteName = "Orion CMS";
  const defaultTitle = "Orion CMS - Advanced Content Management System";
  const defaultDescription =
    "Professional content management system with advanced automation, analytics, and SEO optimization features.";
  const defaultImage = "/og-image.jpg";

  const fullTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaImage = image || defaultImage;
  const metaUrl = url || "/";

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(", ")} />
      )}
      <meta name="author" content={author || siteName} />
      <link rel="canonical" href={metaUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Article specific meta tags */}
      {type === "article" && (
        <>
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {modifiedTime && (
            <meta property="article:modified_time" content={modifiedTime} />
          )}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:creator" content="@orioncms" />
      <meta name="twitter:site" content="@orioncms" />

      {/* Additional SEO Meta Tags */}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* Performance and UX Meta Tags */}
      <meta name="theme-color" content="#000000" />
      <meta name="color-scheme" content="light dark" />
      <meta
        name="format-detection"
        content="telephone=no, date=no, email=no, address=no"
      />

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": type === "article" ? "Article" : "WebSite",
            name: fullTitle,
            description: metaDescription,
            url: metaUrl,
            image: metaImage,
            ...(type === "article" && {
              author: {
                "@type": "Person",
                name: author || siteName,
              },
              publisher: {
                "@type": "Organization",
                name: siteName,
                logo: {
                  "@type": "ImageObject",
                  url: "/logo.png",
                },
              },
              datePublished: publishedTime,
              dateModified: modifiedTime || publishedTime,
            }),
          }),
        }}
      />
    </Head>
  );
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  image,
  url,
}: Omit<MetaTagsProps, "type">) {
  const siteName = "Orion CMS";
  const defaultTitle = "Orion CMS - Advanced Content Management System";
  const defaultDescription =
    "Professional content management system with advanced automation, analytics, and SEO optimization features.";

  return {
    title: title ? `${title} | ${siteName}` : defaultTitle,
    description: description || defaultDescription,
    keywords: keywords.join(", "),
    openGraph: {
      title: title ? `${title} | ${siteName}` : defaultTitle,
      description: description || defaultDescription,
      images: [image || "/og-image.jpg"],
      url: url || "/",
    },
    twitter: {
      title: title ? `${title} | ${siteName}` : defaultTitle,
      description: description || defaultDescription,
      images: [image || "/og-image.jpg"],
    },
  };
}
