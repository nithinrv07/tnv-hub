import { SOCIAL_LINKS } from '../data/site.js';
import SocialIcon from './SocialIcon.jsx';
import { RevealHeading } from './Reveal.jsx';

const sectionTitle = 'font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl lg:text-4xl pb-1';

const link = name => SOCIAL_LINKS.find(s => s.name === name)?.url;

// The channel's "uploads" playlist is its id with UC changed to UU
function youtubeUploadsEmbed(channelUrl) {
  const id = channelUrl?.match(/channel\/(UC[\w-]+)/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/videoseries?list=UU${id.slice(2)}` : null;
}

function instagramEmbed(profileUrl) {
  const user = profileUrl?.match(/instagram\.com\/([^/?#]+)/)?.[1];
  return user ? `https://www.instagram.com/${user}/embed` : null;
}

function facebookEmbed(pageUrl) {
  if (!pageUrl) return null;
  const params = new URLSearchParams({
    href: pageUrl,
    tabs: 'timeline',
    width: '340',
    height: '480',
    small_header: 'true',
    adapt_container_width: 'true',
    hide_cta: 'true'
  });
  return `https://www.facebook.com/plugins/page.php?${params}`;
}

const FEEDS = [
  { name: 'YouTube', icon: 'youtube', label: 'Latest videos', src: youtubeUploadsEmbed(link('YouTube')), url: link('YouTube'), cta: 'Watch on YouTube' },
  { name: 'Facebook', icon: 'facebook', label: 'Facebook updates', src: facebookEmbed(link('Facebook')), url: link('Facebook'), cta: 'Follow on Facebook' },
  { name: 'Instagram', icon: 'instagram', label: 'Instagram posts', src: instagramEmbed(link('Instagram')), url: link('Instagram'), cta: 'Follow on Instagram' }
].filter(f => f.src && f.url);

// Homepage section with the TNV YouTube, Facebook and Instagram feeds embedded
export default function SocialFeeds() {
  if (FEEDS.length === 0) return null;

  return (
    <section id="social" className="scroll-mt-32 bg-neutral-bg py-12 sm:py-16" aria-labelledby="social-title">
      <div className="container-page">
        <RevealHeading id="social-title" className={sectionTitle}>Follow our work</RevealHeading>
        <p className="mt-3 max-w-xl text-sm text-neutral-muted sm:text-base">
          Videos, photos and updates from volunteers across Tamil Nadu.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEEDS.map(feed => (
            <article key={feed.name} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-green-tint bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
                <SocialIcon name={feed.icon} className="h-5 w-5 text-brand-green" />
                <h3 className="font-display font-bold text-neutral-ink">{feed.label}</h3>
              </header>
              <div className="flex flex-1 justify-center bg-neutral-50">
                <iframe
                  src={feed.src}
                  title={`Tamil Nadu Volunteers on ${feed.name}`}
                  loading="lazy"
                  className={`w-full border-0 ${feed.name === 'YouTube' ? 'aspect-video self-start' : 'h-[480px] max-w-[400px]'}`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <a
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-t border-neutral-100 px-4 py-3 text-sm font-semibold text-brand-green hover:bg-brand-green-tint/40"
              >
                {feed.cta} &rarr;
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
