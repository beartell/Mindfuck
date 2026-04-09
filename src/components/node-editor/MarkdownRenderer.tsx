import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

/**
 * Detect media type from URL
 */
function getMediaType(url: string): "image" | "video" | "audio" | "youtube" | "link" {
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?|$)/.test(lower)) return "image";
  if (/\.(mp4|webm|ogv|mov)(\?|$)/.test(lower)) return "video";
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/.test(lower)) return "audio";
  if (/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(lower)) return "youtube";
  return "link";
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Custom link renderer that auto-embeds media
 */
function SmartLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (!href) return <>{children}</>;
  const mediaType = getMediaType(href);

  switch (mediaType) {
    case "image":
      return (
        <span className="block media-embed my-2">
          <img src={href} alt={String(children || "")} className="max-w-full rounded-lg" loading="lazy" />
        </span>
      );
    case "video":
      return (
        <span className="block media-embed my-2">
          <video controls preload="metadata" className="w-full rounded-lg">
            <source src={href} />
          </video>
        </span>
      );
    case "audio":
      return (
        <span className="block media-embed my-2 p-3 rounded-xl bg-card/50 border border-border/20">
          <span className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-muted-foreground/60 font-mono truncate">{href.split("/").pop()}</span>
          </span>
          <audio controls preload="metadata" className="w-full h-9">
            <source src={href} />
          </audio>
        </span>
      );
    case "youtube": {
      const videoId = extractYouTubeId(href);
      if (videoId) {
        return (
          <span className="block media-embed my-2">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title="YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video rounded-lg border-0"
            />
          </span>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>;
    }
    default:
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          {children}
        </a>
      );
  }
}

/**
 * Custom image renderer
 */
function SmartImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    <span className="block media-embed my-2">
      <img src={src} alt={alt || ""} className="max-w-full rounded-lg" loading="lazy" />
    </span>
  );
}

const components: Components = {
  a: ({ href, children }) => <SmartLink href={href}>{children}</SmartLink>,
  img: ({ src, alt }) => <SmartImage src={src} alt={alt} />,
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body text-sm text-foreground/90 ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
